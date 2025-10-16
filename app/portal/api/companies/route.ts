// app/portal/api/companies/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type CompanyPayload = {
  name: string
  website?: string | null
  logo_url?: string | null
  logo_hash?: string | null
}

/** GET /portal/api/companies?q=acme&page=1&pageSize=20 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20)))
    const skip = (page - 1) * pageSize

    const prisma = await getPrisma()
    if (prisma) {
      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { website: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}

      const [items, total] = await Promise.all([
        prisma.sponsor_companies.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.sponsor_companies.count({ where }),
      ])

      return NextResponse.json({ total, items, page, pageSize, source: 'supabase' })
    }

    // devStore fallback
    const all = devStore.getAll<any>('sponsor_companies')
    const filtered = q
      ? all.filter(
          (c) =>
            (c.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
            (c.website ?? '').toLowerCase().includes(q.toLowerCase())
        )
      : all
    const items = filtered.slice(skip, skip + pageSize)
    return NextResponse.json({ total: filtered.length, items, page, pageSize, source: 'devStore' })
  } catch (e: any) {
    console.error('GET /portal/api/companies error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** POST /portal/api/companies  { name, website?, logo_url?, logo_hash? } */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CompanyPayload
    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const website = body.website?.trim() || null
    const logo_url = body.logo_url?.trim() || null
    const logo_hash = body.logo_hash?.trim() || null

    const prisma = await getPrisma()
    if (prisma) {
      // Try to find existing by (name+website) or logo_hash
      const existing =
        (await prisma.sponsor_companies.findFirst({
          where: {
            OR: [
              { AND: [{ name: { equals: name, mode: 'insensitive' } }, { website: website ?? '' }] },
              logo_hash ? { logo_hash } : undefined,
            ].filter(Boolean) as any,
          },
        })) || null

      if (existing) {
        const updated = await prisma.sponsor_companies.update({
          where: { id: existing.id },
          data: {
            // only set if provided
            website: website ?? existing.website,
            logo_url: logo_url ?? existing.logo_url,
            logo_hash: logo_hash ?? existing.logo_hash,
          },
        })
        return NextResponse.json(updated, { status: 200 })
      }

      const created = await prisma.sponsor_companies.create({
        data: { name, website, logo_url, logo_hash },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // devStore fallback: upsert by (name, website) or logo_hash
    const all = devStore.getAll<any>('sponsor_companies')
    const match =
      all.find(
        (c: any) =>
          (c.name?.toLowerCase() === name.toLowerCase() && (c.website ?? '') === (website ?? '')) ||
          (!!logo_hash && c.logo_hash === logo_hash)
      ) ?? null

    const saved = devStore.upsert('sponsor_companies', {
      id: match?.id,
      name,
      website,
      logo_url,
      logo_hash,
      created_at: match?.created_at ?? new Date().toISOString(),
    })
    return NextResponse.json(saved, { status: match ? 200 : 201 })
  } catch (e: any) {
    console.error('POST /portal/api/companies error:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}