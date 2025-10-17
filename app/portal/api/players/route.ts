// app/portal/api/players/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Player = {
  id?: string
  email: string
  name?: string | null
  createdAt?: string | null
}

function parseQP(url: string) {
  const u = new URL(url)
  return {
    q: (u.searchParams.get('q') || '').trim(),
    page: Math.max(1, Number(u.searchParams.get('page') || 1)),
    pageSize: Math.min(100, Math.max(1, Number(u.searchParams.get('pageSize') || 20))),
  }
}

export async function GET(req: Request) {
  try {
    const { q, page, pageSize } = parseQP(req.url)
    const prisma = await getPrisma()

    if (prisma) {
      const where = q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name:  { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' as const },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.user.count({ where }),
      ])

      return NextResponse.json({ source: 'db', total, items })
    }

    // devStore fallback (uses 'users' as players)
    const all = devStore.getAll<Player>('users')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    const filtered = q
      ? all.filter(p =>
          (p.email ?? '').toLowerCase().includes(q.toLowerCase()) ||
          (p.name  ?? '').toLowerCase().includes(q.toLowerCase()),
        )
      : all
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return NextResponse.json({ source: 'devStore', total: filtered.length, items })
  } catch (e: any) {
    console.error('GET /portal/api/players error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email: string = (body.email || '').trim()
    const name: string | undefined = (body.name || '').trim() || undefined
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      // Upsert by unique email
      const created = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // devStore fallback: dedupe by email
    const existing = devStore.getAll<Player>('users').find(u => u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      const updated = devStore.upsert('users', { ...existing, name: name ?? existing.name })
      return NextResponse.json(updated, { status: 200 })
    }
    const created = devStore.upsert<Player>('users', {
      email,
      name,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}