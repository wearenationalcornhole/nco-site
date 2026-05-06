// app/portal/api/events/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import {
  normalizeDateOnly,
  serializeEventRecord,
  slugifyEventTitle,
  type EventRecord,
} from '@/app/lib/eventRecords'
import { listManagedEventIds, requireRouteRoles } from '@/app/lib/portalRouteAccess'

type EventRowDb = EventRecord & { state?: string | null }

type ListPayload = {
  total: number
  page: number
  pageSize: number
  events: EventRowDb[]
  source: 'db' | 'dev'
}

function like(s?: string | null) {
  return (s ?? '').toLowerCase()
}

function toDateInput(value?: string | null) {
  const normalized = normalizeDateOnly(value)
  return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '12')))
    const state = (searchParams.get('state') ?? '').trim().toUpperCase() || undefined
    const month = (searchParams.get('month') ?? '').trim() || undefined // format: YYYY-MM
    const managedOnly = searchParams.get('managedOnly') === '1'

    const prisma = await getPrisma()
    const access = managedOnly ? await requireRouteRoles(['organizer', 'admin']) : null
    if (access && 'error' in access) return access.error
    const managedEventIds = access ? await listManagedEventIds(access.actor) : null

    // DB path
    if (prisma) {
      // Build where clause
      const where: any = {}

      if (q) {
        // title OR city OR slug ilike
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ]
      }

      if (state) {
        // Only apply if you actually have a 'state' column; remove otherwise
        where.state = state
      }

      if (month) {
        // month as YYYY-MM → build range on date string if you store as YYYY-MM-DD
        // If date is a Date column in DB, adjust filtering accordingly.
        const [y, m] = month.split('-').map(Number)
        if (y && m) {
          const start = `${y}-${String(m).padStart(2, '0')}-01`
          // Simple end calc: next month first day
          const nextM = m === 12 ? 1 : m + 1
          const nextY = m === 12 ? y + 1 : y
          const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`

          where.date = { gte: start, lt: end }
        }
      }

      if (managedOnly && managedEventIds !== null) {
        where.id = { in: managedEventIds }
      }

      const [total, rows] = await Promise.all([
        prisma.events.count({ where }),
        prisma.events.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            slug: true,
            title: true,
            city: true,
            date: true,
            image: true,
            created_at: true,
            // state: true, // uncomment if you add a state column
          },
        }) as unknown as Promise<Record<string, any>[]>,
      ])

      const payload: ListPayload = {
        total,
        page,
        pageSize,
        events: rows.map((row) => serializeEventRecord(row)),
        source: 'db',
      }
      return NextResponse.json(payload)
    }

    // dev fallback
    const all = devStore.getAll<Record<string, any>>('events').map((row) => serializeEventRecord(row))

    let filtered = all.filter((e) => {
      const matchesQ =
        !q ||
        like(e.title).includes(q) ||
        like(e.city).includes(q) ||
        like(e.slug).includes(q)

      const matchesState = !state || (e as any).state === state

      const matchesMonth = !month
        ? true
        : (() => {
            if (!e.date) return false
            return e.date.startsWith(month) // naive but fine for dev
          })()

      return matchesQ && matchesState && matchesMonth
    })

    if (managedOnly && managedEventIds !== null) {
      const managedIds = new Set(managedEventIds)
      filtered = filtered.filter((event) => managedIds.has(event.id))
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    filtered = filtered.slice(start, start + pageSize)

    const payload: ListPayload = {
      total,
      page,
      pageSize,
      events: filtered,
      source: 'dev',
    }
    return NextResponse.json(payload)
  } catch (e: any) {
    console.error('GET /portal/api/events error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

type CreateBody = Partial<{
  title: string
  slug: string | null
  city: string | null
  date: string | null
  image: string | null
  logo_url: string | null
}>

export async function POST(req: Request) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const body: CreateBody = await req.json()
    const title = String(body.title ?? '').trim()
    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    const slug = (body.slug ? String(body.slug) : slugifyEventTitle(title)).trim() || null
    const city = body.city ? String(body.city).trim() : null
    const date = normalizeDateOnly(body.date)
    const image = body.image ? String(body.image).trim() : null
    const logo_url = body.logo_url ? String(body.logo_url).trim() : null

    const prisma = await getPrisma()
    if (prisma) {
      if (slug) {
        const existing = await prisma.events.findFirst({ where: { slug } })
        if (existing) {
          return NextResponse.json({ error: 'slug already in use' }, { status: 409 })
        }
      }

      const created = await prisma.events.create({
        data: {
          title,
          slug,
          city,
          date: toDateInput(date),
          image,
          logo_url,
        } as any,
      })

      try {
        await (prisma as any).$executeRaw`
          insert into event_admins (event_id, user_id)
          values (${created.id}::uuid, ${access.actor.user.id}::uuid)
          on conflict (event_id, user_id) do nothing
        `
      } catch (adminLinkError) {
        console.error('POST /portal/api/events event_admins link error:', adminLinkError)

        if (access.actor.role !== 'admin') {
          await prisma.events.delete({ where: { id: created.id } }).catch(() => null)
          return NextResponse.json(
            { error: 'Event created but organizer access could not be linked. Please try again.' },
            { status: 500 },
          )
        }
      }

      return NextResponse.json(serializeEventRecord(created), { status: 201 })
    }

    const existing = slug
      ? devStore.getAll<Record<string, any>>('events').find((event) => event.slug === slug)
      : null
    if (existing) {
      return NextResponse.json({ error: 'slug already in use' }, { status: 409 })
    }

    const created = devStore.upsert('events', {
      title,
      slug,
      city,
      date,
      image,
      logo_url,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json(serializeEventRecord(created), { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
