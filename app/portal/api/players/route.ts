export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Q = { q?: string; page?: string }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = 20
    const prisma = await getPrisma()

    if (prisma) {
      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}

      const [items, total] = await Promise.all([
        prisma.users.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.users.count({ where }),
      ])

      return NextResponse.json({ source: 'db', items, total, page, pageSize })
    }

    // devStore fallback
    let items = devStore.getAll<any>('users')
    if (q) {
      const qq = q.toLowerCase()
      items = items.filter(
        (u: any) =>
          (u.name || '').toLowerCase().includes(qq) ||
          (u.email || '').toLowerCase().includes(qq)
      )
    }
    const total = items.length
    const paged = items.slice((page - 1) * pageSize, page * pageSize)
    return NextResponse.json({ source: 'dev', items: paged, total, page, pageSize })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body?.email || '').trim()
    const name = (body?.name || '').trim()
    if (!email && !name) {
      return NextResponse.json({ error: 'email or name required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // Try find by email if present
      const existing =
        email ? await prisma.users.findFirst({ where: { email } }) : null
      if (existing) return NextResponse.json(existing, { status: 200 })

      const created = await prisma.users.create({
        data: { email: email || null, name: name || null },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // devStore fallback
    const all = devStore.getAll<any>('users')
    const byEmail = email ? all.find((u: any) => u.email === email) : null
    if (byEmail) return NextResponse.json(byEmail, { status: 200 })

    const created = devStore.upsert('users', {
      email: email || undefined,
      name: name || undefined,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}