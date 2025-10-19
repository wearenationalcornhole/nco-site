// app/portal/api/events/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type EventRowDb = {
  id: string
  slug: string | null
  title: string
  city: string | null
  date: string | null // YYYY-MM-DD (or null)
  image: string | null
  created_at?: string | null
  state?: string | null // optional if you add states later
}

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '12')))
    const state = (searchParams.get('state') ?? '').trim().toUpperCase() || undefined
    const month = (searchParams.get('month') ?? '').trim() || undefined // format: YYYY-MM

    const prisma = await getPrisma()

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
        }) as unknown as Promise<EventRowDb[]>,
      ])

      const payload: ListPayload = {
        total,
        page,
        pageSize,
        events: rows,
        source: 'db',
      }
      return NextResponse.json(payload)
    }

    // dev fallback
    const all = devStore.getAll<EventRowDb>('events')

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