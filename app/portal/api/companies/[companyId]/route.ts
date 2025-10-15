export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await ctx.params
    const prisma = await getPrisma()

    if (prisma) {
      const company = await prisma.sponsorCompany.findUnique({ where: { id: companyId } })
      if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const links = await prisma.eventSponsor.findMany({
        where: { companyId },
        include: { event: true },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        id: company.id,
        name: company.name,
        website: company.website,
        logo: company.logoUrl,
        logoHash: company.logoHash,
        createdAt: company.createdAt,
        events: links.map((l: any) => ({
          linkId: l.id,
          tier: l.tier,
          joinedAt: l.createdAt,
          event: {
            id: l.event.id,
            slug: l.event.slug,
            title: l.event.title,
            city: l.event.city,
            date: l.event.date,
            image: l.event.image,
          },
        })),
      })
    }

    // dev fallback
    const companies = devStore.getAll<any>('sponsor_companies')
    const company = companies.find((c: any) => c.id === companyId)
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const links = devStore.getAll<any>('event_sponsors').filter((x) => x.companyId === companyId)
    const events = devStore.getAll<any>('events')
    return NextResponse.json({
      id: company.id,
      name: company.name,
      website: company.website,
      logo: company.logoUrl,
      logoHash: company.logoHash,
      createdAt: company.createdAt,
      events: links.map((l: any) => ({
        linkId: l.id,
        tier: l.tier,
        joinedAt: l.createdAt,
        event: events.find((e: any) => e.id === l.eventId) ?? null,
      })),
    })
  } catch (e) {
    console.error('GET /companies/[companyId] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}