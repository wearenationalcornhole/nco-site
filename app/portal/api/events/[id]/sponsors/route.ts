export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { getEventSponsorsModel, getSponsorCompaniesModel } from '@/app/lib/prismaModels'

type SponsorPayload = {
  name: string
  url?: string
  logo?: string
  logoHash?: string // hex SHA-256 of logo file (optional but recommended)
  tier?: string
}

// GET: sponsors attached to an event (flattened for UI)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await ctx.params
    const prisma = await getPrisma()

    if (prisma) {
      const EventSponsors = getEventSponsorsModel(prisma)
      if (!EventSponsors) throw new Error('Model event_sponsors not found')
      const rows = await EventSponsors.findMany({
        where: { event_id: eventId },
        include: { sponsor_companies: true },
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json(
        rows.map((r: any) => ({
          id: r.id,                    // link id (event_sponsors)
          companyId: r.company_id,
          name: r.sponsor_companies?.name ?? '—',
          url: r.sponsor_companies?.website ?? null,
          logo: r.sponsor_companies?.logo_url ?? null,
          logoHash: r.sponsor_companies?.logo_hash ?? null,
          tier: r.tier ?? null,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at ?? null,
        }))
      )
    }

    // dev fallback
    const links = devStore
      .getAll<any>('event_sponsors')
      .filter((x) => (x.event_id ?? x.eventId) === eventId)
    const companies = devStore.getAll<any>('sponsor_companies')
    const out = links.map((lnk: any) => {
      const companyId = lnk.company_id ?? lnk.companyId
      const c = companies.find((c: any) => c.id === companyId)
      return {
        id: lnk.id,
        companyId,
        name: c?.name ?? '—',
        url: c?.website ?? null,
        logo: c?.logo_url ?? c?.logoUrl ?? null,
        logoHash: c?.logo_hash ?? c?.logoHash ?? null,
        tier: lnk.tier ?? null,
        createdAt: lnk.created_at ?? lnk.createdAt ?? null,
      }
    })
    return NextResponse.json(out)
  } catch (e) {
    console.error('GET /events/[eventId]/sponsors error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: upsert company (by logoHash or case-insensitive name) then link to event
export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await ctx.params
    const { name, url, logo, logoHash, tier }: SponsorPayload = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const EventSponsors = getEventSponsorsModel(prisma)
      const SponsorCompanies = getSponsorCompaniesModel(prisma)
      if (!EventSponsors) throw new Error('Model event_sponsors not found')
      if (!SponsorCompanies) throw new Error('Model sponsor_companies not found')
      // 1) find company by hash or name
      let company = null as any
      if (logoHash) {
        company = await SponsorCompanies.findFirst({ where: { logo_hash: logoHash } })
      }
      if (!company) {
        company = await SponsorCompanies.findFirst({
          where: { name: { equals: name.trim(), mode: 'insensitive' } },
        })
      }

      // 2) create or update minimal fields if missing
      if (!company) {
        company = await SponsorCompanies.create({
          data: {
            name: name.trim(),
            website: url ?? null,
            logo_url: logo ?? null,
            logo_hash: logoHash ?? null,
          },
        })
      } else {
        const updates: any = {}
        if (url && !company.website) updates.website = url
        if (logo && !company.logo_url) updates.logo_url = logo
        if (logoHash && !company.logo_hash) updates.logo_hash = logoHash
        if (Object.keys(updates).length) {
          company = await SponsorCompanies.update({
            where: { id: company.id },
            data: updates,
          })
        }
      }

      // 3) link to event (avoid composite upsert type issues by findFirst→create/update)
      const existingLink = await EventSponsors.findFirst({
        where: { event_id: eventId, company_id: company.id },
      })
      const link = existingLink
        ? await EventSponsors.update({
            where: { id: existingLink.id },
            data: { tier: tier ?? existingLink.tier ?? null },
            include: { sponsor_companies: true },
          })
        : await EventSponsors.create({
            data: { event_id: eventId, company_id: company.id, tier: tier ?? null },
            include: { sponsor_companies: true },
          })

      return NextResponse.json(
        {
          id: link.id,
          companyId: link.company_id,
          name: link.sponsor_companies.name,
          url: link.sponsor_companies.website,
          logo: link.sponsor_companies.logo_url,
          logoHash: link.sponsor_companies.logo_hash,
          tier: link.tier,
          createdAt: link.created_at instanceof Date ? link.created_at.toISOString() : link.created_at ?? null,
        },
        { status: 201 }
      )
    }

    // dev fallback (simple dedupe)
    const companies = devStore.getAll<any>('sponsor_companies')
    let company = logoHash
      ? companies.find((c: any) => c.logoHash === logoHash)
      : companies.find((c: any) => c.name?.toLowerCase() === name.trim().toLowerCase())
    if (!company) {
      company = devStore.upsert('sponsor_companies', {
        id: crypto.randomUUID(),
        name: name.trim(),
        website: url ?? null,
        logo_url: logo ?? null,
        logo_hash: logoHash ?? null,
        created_at: new Date().toISOString(),
      })
    }
    const existingLink = devStore.getAll<any>('event_sponsors')
      .find((x) => (x.event_id ?? x.eventId) === eventId && (x.company_id ?? x.companyId) === company.id)
    const link = existingLink ?? devStore.upsert('event_sponsors', {
      id: crypto.randomUUID(),
      event_id: eventId,
      company_id: company.id,
      tier: tier ?? null,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json({
      id: link.id,
      companyId: company.id,
      name: company.name,
      url: company.website,
      logo: company.logo_url ?? company.logoUrl ?? null,
      logoHash: company.logo_hash ?? company.logoHash ?? null,
      tier: link.tier,
      createdAt: link.created_at ?? link.createdAt ?? null,
    }, { status: 201 })
  } catch (e: any) {
    console.error('POST /events/[eventId]/sponsors error', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}
