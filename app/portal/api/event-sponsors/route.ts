// app/portal/api/event-sponsors/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// GET /portal/api/event-sponsors?eventId=evt_1
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId') ?? ''
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const links = await prisma.event_sponsors.findMany({
        where: { event_id: eventId },
        include: { sponsor_companies: true },
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json(links)
    }

    // devStore fallback
    const links = devStore
      .getAll<any>('event_sponsors')
      .filter((l) => l.event_id === eventId)
      .map((l) => ({
        ...l,
        sponsor_companies: devStore.getById('sponsor_companies', l.company_id),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )
    return NextResponse.json(links)
  } catch (e) {
    console.error('GET /portal/api/event-sponsors error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /portal/api/event-sponsors
// body: { eventId: string; companyId: string; tier?: string }
export async function POST(req: Request) {
  try {
    const { eventId, companyId, tier } = await req.json()
    if (!eventId || !companyId) {
      return NextResponse.json({ error: 'eventId and companyId required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // Unique on (event_id, company_id) — upsert manually
      const existing = await prisma.event_sponsors.findFirst({
        where: { event_id: eventId, company_id: companyId },
      })
      const link = existing
        ? await prisma.event_sponsors.update({
            where: { id: existing.id },
            data: { tier: tier ?? existing.tier ?? null },
          })
        : await prisma.event_sponsors.create({
            data: { event_id: eventId, company_id: companyId, tier: tier ?? null },
          })

      return NextResponse.json(link, { status: existing ? 200 : 201 })
    }

    // devStore fallback
    const all = devStore.getAll<any>('event_sponsors')
    const dupe = all.find((l) => l.event_id === eventId && l.company_id === companyId)
    const link = dupe
      ? devStore.upsert('event_sponsors', {
          ...dupe,
          tier: tier ?? dupe.tier ?? null,
        })
      : devStore.upsert('event_sponsors', {
          id: crypto.randomUUID(),
          event_id: eventId,
          company_id: companyId,
          tier: tier ?? null,
          created_at: new Date().toISOString(),
        })

    return NextResponse.json(link, { status: dupe ? 200 : 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}