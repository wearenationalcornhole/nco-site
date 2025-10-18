// app/portal/api/players/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * GET /portal/api/players?q=&page=&pageSize=
 * Lists players (users). Supports search & basic pagination.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)))
    const offset = (page - 1) * pageSize

    const prisma = await getPrisma()
    if (prisma) {
      const where = q
        ? {
            OR: [
              { name:   { contains: q, mode: 'insensitive' as const } },
              { email:  { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: offset, take: pageSize,
          select: { id: true, name: true, email: true, createdAt: true },
        }),
        prisma.user.count({ where }),
      ])

      return NextResponse.json({ items, total, page, pageSize, source: 'prisma' })
    }

    // dev fallback
    const all = devStore.getAll<any>('users')
    const filtered = q
      ? all.filter((u) =>
          (u.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
          (u.email ?? '').toLowerCase().includes(q.toLowerCase())
        )
      : all
    const total = filtered.length
    const items = filtered
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(offset, offset + pageSize)

    return NextResponse.json({ items, total, page, pageSize, source: 'devStore' })
  } catch (e: any) {
    console.error('GET /portal/api/players failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /portal/api/players
 * { email, name? } → creates (or returns existing) player.
 */
export async function POST(req: Request) {
  try {
    const { email, name } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return NextResponse.json(existing)

      const created = await prisma.user.create({
        data: { email, name: name || null },
        select: { id: true, name: true, email: true, createdAt: true },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // dev fallback
    const all = devStore.getAll<any>('users')
    const found = all.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (found) return NextResponse.json(found)
    const created = devStore.upsert('users', {
      email,
      name: name || null,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}