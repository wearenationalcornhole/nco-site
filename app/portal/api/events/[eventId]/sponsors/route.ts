export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

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
      const rows = await prisma.eventSponsor.findMany({
        where: { eventId },
        include: { company: true },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(
        rows.map((r: any) => ({
          id: r.id,                    // link id (event_sponsors)
          companyId: r.companyId,
          name: r.company?.name ?? '—',
          url: r.company?.website ?? null,
          logo: r.company?.logoUrl ?? null,
          logoHash: r.company?.logoHash ?? null,
          tier: r.tier ?? null,
          createdAt: r.createdAt,
        }))
      )
    }

    // dev fallback
    const links = devStore.getAll<any>('event_sponsors').filter((x) => x.eventId === eventId)
    const companies = devStore.getAll<any>('sponsor_companies')
    const out = links.map((lnk: any) => {
      const c = companies.find((c: any) => c.id === lnk.companyId)
      return {
        id: lnk.id,
        companyId: lnk.companyId,
        name: c?.name ?? '—',
        url: c?.website ?? null,
        logo: c?.logoUrl ?? null,
        logoHash: c?.logoHash ?? null,
        tier: lnk.tier ?? null,
        createdAt: lnk.createdAt,
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
      // 1) find company by hash or name
      let company = null as any
      if (logoHash) {
        company = await prisma.sponsorCompany.findFirst({ where: { logoHash } })
      }
      if (!company) {
        company = await prisma.sponsorCompany.findFirst({
          where: { name: { equals: name.trim(), mode: 'insensitive' } },
        })
      }

      // 2) create or update minimal fields if missing
      if (!company) {
        company = await prisma.sponsorCompany.create({
          data: {
            name: name.trim(),
            website: url ?? null,
            logoUrl: logo ?? null,
            logoHash: logoHash ?? null,
          },
        })
      } else {
        const updates: any = {}
        if (url && !company.website) updates.website = url
        if (logo && !company.logoUrl) updates.logoUrl = logo
        if (logoHash && !company.logoHash) updates.logoHash = logoHash
        if (Object.keys(updates).length) {
          company = await prisma.sponsorCompany.update({
            where: { id: company.id },
            data: updates,
          })
        }
      }

      // 3) link to event (avoid composite upsert type issues by findFirst→create/update)
      const existingLink = await prisma.eventSponsor.findFirst({
        where: { eventId, companyId: company.id },
      })
      const link = existingLink
        ? await prisma.eventSponsor.update({
            where: { id: existingLink.id },
            data: { tier: tier ?? existingLink.tier ?? null },
            include: { company: true },
          })
        : await prisma.eventSponsor.create({
            data: { eventId, companyId: company.id, tier: tier ?? null },
            include: { company: true },
          })

      return NextResponse.json(
        {
          id: link.id,
          companyId: link.companyId,
          name: link.company.name,
          url: link.company.website,
          logo: link.company.logoUrl,
          logoHash: link.company.logoHash,
          tier: link.tier,
          createdAt: link.createdAt,
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
        logoUrl: logo ?? null,
        logoHash: logoHash ?? null,
        createdAt: new Date().toISOString(),
      })
    }
    const existingLink = devStore.getAll<any>('event_sponsors')
      .find((x) => x.eventId === eventId && x.companyId === company.id)
    const link = existingLink ?? devStore.upsert('event_sponsors', {
      id: crypto.randomUUID(),
      eventId,
      companyId: company.id,
      tier: tier ?? null,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({
      id: link.id,
      companyId: company.id,
      name: company.name,
      url: company.website,
      logo: company.logoUrl,
      logoHash: company.logoHash,
      tier: link.tier,
      createdAt: link.createdAt,
    }, { status: 201 })
  } catch (e: any) {
    console.error('POST /events/[eventId]/sponsors error', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}