// app/portal/api/companies/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// GET /portal/api/companies?q=&page=1&pageSize=20
export async function GET(req: Request) {
  try {
    const prisma = await getPrisma()
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20)))
    const skip = (page - 1) * pageSize

    if (prisma) {
      const where: any = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { website: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}

      const [total, items] = await Promise.all([
        prisma.sponsor_companies.count({ where }),
        prisma.sponsor_companies.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: pageSize,
        }),
      ])

      return NextResponse.json({ total, items })
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
    const total = filtered.length
    const items = filtered.slice(skip, skip + pageSize)
    return NextResponse.json({ total, items })
  } catch (e) {
    console.error('GET /portal/api/companies error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /portal/api/companies
// body: { name: string; website?: string; logo_url?: string; logo_hash?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, website, logo_url, logo_hash } = body ?? {}
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // Prefer matching on logo_hash if provided, else match on name+website
      let existing = null
      if (logo_hash) {
        existing = await prisma.sponsor_companies.findUnique({ where: { logo_hash } })
      }
      if (!existing) {
        existing = await prisma.sponsor_companies.findFirst({
          where: {
            name: { equals: name, mode: 'insensitive' },
            website: website ?? null,
          },
        })
      }

      const saved = existing
        ? await prisma.sponsor_companies.update({
            where: { id: existing.id },
            data: { name, website, logo_url, logo_hash },
          })
        : await prisma.sponsor_companies.create({
            data: { name, website, logo_url, logo_hash },
          })

      return NextResponse.json(saved, { status: existing ? 200 : 201 })
    }

    // devStore fallback
    // Try to dedupe by logo_hash, then by (name, website)
    const all = devStore.getAll<any>('sponsor_companies')
    let match =
      (logo_hash && all.find((c) => c.logo_hash === logo_hash)) ||
      all.find(
        (c) =>
          (c.name ?? '').toLowerCase() === name.toLowerCase() &&
          (c.website ?? null) === (website ?? null)
      )

    const saved = match
      ? devStore.upsert('sponsor_companies', {
          ...match,
          name,
          website,
          logo_url,
          logo_hash,
        })
      : devStore.upsert('sponsor_companies', {
          id: crypto.randomUUID(),
          name,
          website,
          logo_url,
          logo_hash,
          created_at: new Date().toISOString(),
        })

    return NextResponse.json(saved, { status: match ? 200 : 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}