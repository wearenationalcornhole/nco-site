// app/portal/api/events/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { normalizeDateOnly, serializeEventRecord } from '@/app/lib/eventRecords'
import { canManageEvent, requireRouteRoles } from '@/app/lib/portalRouteAccess'

type Body = Partial<{
  title: string
  city: string | null
  region: string | null
  country: string | null
  date: string | null
  image: string | null
  logo_url: string | null
  slug: string | null
}>

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const ev = await prisma.events.findUnique({ where: { id } })
      if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(serializeEventRecord(ev))
    }

    const ev = devStore.getById('events', id)
    if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(serializeEventRecord(ev))
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error
    const allowedActor = await canManageEvent(access.actor, id)
    if (!allowedActor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body: Body = await req.json()

    const allowed: Body = {}
    for (const k of ['title', 'city', 'region', 'country', 'date', 'image', 'logo_url', 'slug'] as const) {
      if (k in body) (allowed as any)[k] = (body as any)[k]
    }

    if (typeof allowed.title === 'string') allowed.title = allowed.title.trim()
    if (typeof allowed.city === 'string') allowed.city = allowed.city.trim() || null
    if (typeof allowed.region === 'string') allowed.region = allowed.region.trim() || null
    if (typeof allowed.country === 'string') allowed.country = allowed.country.trim().toUpperCase() || 'US'
    if (typeof allowed.slug === 'string') allowed.slug = allowed.slug.trim() || null
    if (typeof allowed.image === 'string') allowed.image = allowed.image.trim() || null
    if (typeof allowed.logo_url === 'string') allowed.logo_url = allowed.logo_url.trim() || null

    const prisma = await getPrisma()
    if (prisma) {
      if (allowed.slug) {
        const conflict = await prisma.events.findFirst({
          where: { slug: allowed.slug, NOT: { id } },
          select: { id: true },
        })
        if (conflict) {
          return NextResponse.json({ error: 'slug already in use' }, { status: 409 })
        }
      }

      const updated = await prisma.events.update({
        where: { id },
        data: {
          ...(allowed.title !== undefined ? { title: allowed.title } : {}),
          ...(allowed.city !== undefined ? { city: allowed.city } : {}),
          ...(allowed.region !== undefined ? { region: allowed.region } : {}),
          ...(allowed.country !== undefined ? { country: allowed.country } : {}),
          ...(allowed.date !== undefined
            ? {
                date: (() => {
                  const normalized = normalizeDateOnly(allowed.date)
                  return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null
                })(),
              }
            : {}),
          ...(allowed.image !== undefined ? { image: allowed.image } : {}),
          ...(allowed.logo_url !== undefined ? { logo_url: allowed.logo_url } : {}),
          ...(allowed.slug !== undefined ? { slug: allowed.slug } : {}),
        } as any,
      })
      return NextResponse.json(serializeEventRecord(updated))
    }

    // DevStore fallback
    const existing = devStore.getById<any>('events', id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (allowed.slug) {
      const conflict = devStore
        .getAll<any>('events')
        .find((event) => event.id !== id && event.slug === allowed.slug)
      if (conflict) {
        return NextResponse.json({ error: 'slug already in use' }, { status: 409 })
      }
    }
    const updated = devStore.upsert('events', { ...existing, ...allowed })
    return NextResponse.json(serializeEventRecord(updated))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error
    const allowedActor = await canManageEvent(access.actor, id)
    if (!allowedActor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const prisma = await getPrisma()
    if (prisma) {
      await prisma.events.delete({ where: { id } })
      await access.actor.supabase.from('event_admins').delete().eq('event_id', id)
      return NextResponse.json({ ok: true })
    }

    const divisions = devStore
      .getAll<any>('event_divisions')
      .filter((division) => division.event_id === id)
    const divisionIds = new Set(divisions.map((division) => division.id))

    for (const table of ['registrations', 'event_sponsors', 'event_bag_submissions', 'sponsors'] as const) {
      for (const row of devStore.getAll<any>(table)) {
        if (row.event_id === id) devStore.remove(table, row.id)
      }
    }

    for (const row of devStore.getAll<any>('event_division_members')) {
      if (divisionIds.has(row.division_id)) devStore.remove('event_division_members', row.id)
    }

    for (const division of divisions) {
      devStore.remove('event_divisions', division.id)
    }

    const ok = devStore.remove('events', id)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await access.actor.supabase.from('event_admins').delete().eq('event_id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
