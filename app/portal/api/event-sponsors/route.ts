export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * GET /portal/api/event-sponsors?eventId=evt_123
 *  → [{ id, event_id, company_id, tier, company: { id, name, website, logo, logoHash } }]
 *
 * POST /portal/api/event-sponsors
 *  body: { eventId, companyId, tier? }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId') ?? ''
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const EventSponsors     = (prisma as any).event_sponsors
      const SponsorCompanies  = (prisma as any).sponsor_companies
      if (!EventSponsors || !SponsorCompanies) throw new Error('Models not found')

      const links = await EventSponsors.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
      })
      const companyIds = [...new Set(links.map((l: any) => l.company_id))]

      const companies = companyIds.length
        ? await SponsorCompanies.findMany({ where: { id: { in: companyIds } } })
        : []

      const byId: Record<string, any> = {}
      for (const c of companies) {
        byId[c.id] = {
          id: c.id,
          name: c.name,
          website: c.website ?? null,
          logo: c.logo_url ?? null,
          logoHash: c.logo_hash ?? null,
        }
      }

      const result = links.map((l: any) => ({
        id: l.id,
        event_id: l.event_id,
        company_id: l.company_id,
        tier: l.tier ?? null,
        company: byId[l.company_id] ?? null,
      }))

      return NextResponse.json(result)
    }

    // dev fallback
    const links    = (devStore as any).getAll('event_sponsors').filter((l: any) => l.event_id === eventId)
    const companies = (devStore as any).getAll('sponsor_companies')
    const byId: Record<string, any> = Object.fromEntries(companies.map((c: any) => [c.id, {
      id: c.id, name: c.name, website: c.website ?? null, logo: c.logoUrl ?? null, logoHash: c.logoHash ?? null,
    }]))
    const result = links.map((l: any) => ({ ...l, company: byId[l.company_id] ?? null }))
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('GET /portal/api/event-sponsors error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { eventId, companyId, tier } = await req.json().catch(() => ({}))
    if (!eventId || !companyId) {
      return NextResponse.json({ error: 'eventId and companyId required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const EventSponsors = (prisma as any).event_sponsors
      if (!EventSponsors) throw new Error('Model event_sponsors not found')

      const existing = await EventSponsors.findFirst({ where: { event_id: eventId, company_id: companyId } })
      if (existing) return NextResponse.json(existing, { status: 200 })

      const created = await EventSponsors.create({
        data: { event_id: eventId, company_id: companyId, tier: tier ?? null },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // dev fallback
    const created = (devStore as any).upsert('event_sponsors', { event_id: eventId, company_id: companyId, tier: tier ?? null })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/event-sponsors error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}