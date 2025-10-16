// app/portal/api/event-sponsors/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** GET /portal/api/event-sponsors?eventId=evt_123 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId') ?? ''
    if (!eventId) return NextResponse.json([], { status: 200 })

    const prisma = await getPrisma()
    if (prisma) {
      const links = await prisma.event_sponsors.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
        include: { company: true },
      })
      return NextResponse.json(links, { status: 200 })
    }

    const links = devStore.getAll<any>('event_sponsors').filter((l) => l.event_id === eventId)
    const companies = devStore.getAll<any>('sponsor_companies')
    const joined = links.map((l) => ({ ...l, company: companies.find((c) => c.id === l.company_id) ?? null }))
    return NextResponse.json(joined, { status: 200 })
  } catch (e: any) {
    console.error('GET /portal/api/event-sponsors error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** POST /portal/api/event-sponsors  { eventId, companyId } */
export async function POST(req: Request) {
  try {
    const { eventId, companyId } = (await req.json()) as { eventId?: string; companyId?: string }
    if (!eventId || !companyId) {
      return NextResponse.json({ error: 'eventId and companyId required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const existing = await prisma.event_sponsors.findFirst({
        where: { event_id: eventId, company_id: companyId },
      })
      const link = existing
        ? existing
        : await prisma.event_sponsors.create({ data: { event_id: eventId, company_id: companyId } })
      return NextResponse.json(link, { status: existing ? 200 : 201 })
    }

    // devStore fallback
    const all = devStore.getAll<any>('event_sponsors')
    const match = all.find((l) => l.event_id === eventId && l.company_id === companyId)
    const saved = devStore.upsert('event_sponsors', {
      id: match?.id,
      event_id: eventId,
      company_id: companyId,
      created_at: match?.created_at ?? new Date().toISOString(),
    })
    return NextResponse.json(saved, { status: match ? 200 : 201 })
  } catch (e: any) {
    console.error('POST /portal/api/event-sponsors error:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}