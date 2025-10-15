export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(req: Request) {
  try {
    const prisma = await getPrisma()
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    if (prisma) {
      const SponsorCompanies = (prisma as any).sponsor_companies
      const EventSponsors   = (prisma as any).event_sponsors
      if (!SponsorCompanies) throw new Error('Model sponsor_companies not found')

      const where = q ? {
        OR: [
          { name:    { contains: q, mode: 'insensitive' } },
          { website: { contains: q, mode: 'insensitive' } },
        ],
      } : {}

      const rows  = await SponsorCompanies.findMany({ where, orderBy: { created_at: 'desc' }, skip: offset, take: limit })
      const total = await SponsorCompanies.count({ where })

      const items = await Promise.all(rows.map(async (c: any) => {
        const sponsoredEvents = EventSponsors
          ? await EventSponsors.count({ where: { company_id: c.id } })
          : 0
        return {
          id: c.id,
          name: c.name,
          website: c.website ?? null,
          logo: c.logo_url ?? null,
          logoHash: c.logo_hash ?? null,
          sponsoredEvents,
          createdAt: c.created_at ?? null,
        }
      }))

      return NextResponse.json({ total, items })
    }

    // devStore fallback
    const companies = devStore.getAll<any>('sponsor_companies')
    const links     = devStore.getAll<any>('event_sponsors')

    const filtered = q
      ? companies.filter((c: any) => {
          const needle = q.toLowerCase()
          return (c.name ?? '').toLowerCase().includes(needle) ||
                 (c.website ?? '').toLowerCase().includes(needle)
        })
      : companies

    const total = filtered.length
    const paged = filtered.slice(offset, offset + limit)
    const items = paged.map((c: any) => ({
      id: c.id,
      name: c.name,
      website: c.website ?? null,
      logo: c.logoUrl ?? null,
      logoHash: c.logoHash ?? null,
      sponsoredEvents: links.filter((l: any) => l.companyId === c.id).length,
      createdAt: c.createdAt ?? null,
    }))

    return NextResponse.json({ total, items })
  } catch (e: any) {
    console.error('GET /portal/api/companies error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const prisma = await getPrisma()
    const body = await req.json().catch(() => ({}))
    const { name, website } = body ?? {}
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    if (prisma) {
      const SponsorCompanies = (prisma as any).sponsor_companies
      if (!SponsorCompanies) throw new Error('Model sponsor_companies not found')

      // de-dupe by name (case-insensitive). You can expand this later.
      const existing = await SponsorCompanies.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      })
      if (existing) return NextResponse.json(existing, { status: 200 })

      const created = await SponsorCompanies.create({
        data: {
          name,
          website: website ?? null,
          // logo_url/logo_hash will be updated by the upload route
        },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // devStore fallback
    const created = devStore.upsert('sponsor_companies', { name, website })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/companies error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}