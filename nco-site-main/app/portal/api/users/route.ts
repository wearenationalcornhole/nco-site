export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()

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
      const rows = await prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 20,
      })
      return NextResponse.json({ source: 'db', items: rows })
    }

    // dev fallback
    const all = devStore.getAll<any>('users')
    const items = q
      ? all.filter(
          (u) =>
            (u.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
            (u.email ?? '').toLowerCase().includes(q.toLowerCase())
        )
      : all.slice(-20).reverse()
    return NextResponse.json({ source: 'dev', items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // upsert by email (so we don’t create dupes)
      const user = await prisma.users.upsert({
        where: { email },
        update: { name: name ?? undefined },
        create: { email, name: name ?? null },
      })
      return NextResponse.json(user, { status: 201 })
    }

    // dev fallback
    const existing = devStore.getAll<any>('users').find((u) => u.email === email)
    const created = existing
      ? devStore.upsert('users', { ...existing, name: name ?? existing.name })
      : devStore.upsert('users', { email, name: name ?? null, created_at: new Date().toISOString() })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}