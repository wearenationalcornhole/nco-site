export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * GET /portal/api/events/[id]/registrations
 * Query params:
 *   q?   — search (name/email/userId)
 *   page? perPage? — optional pagination (defaults page=1, perPage=50)
 */
export async function GET(req: Request, context: any) {
  try {
    const eventId = context.params?.id as string
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').toLowerCase().trim()
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(url.searchParams.get('perPage') || '50', 10), 1), 200)

    const prisma = await getPrisma()
    if (prisma) {
      // Prisma branch (if your Registration model exists)
      const where = {
        eventId,
        ...(q
          ? {
              OR: [
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { userId: { contains: q } },
              ],
            }
          : {}),
      }
      const [items, total] = await Promise.all([
        prisma.registration.findMany({
          where,
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.registration.count({ where }),
      ])
      return NextResponse.json({ items, total, page, perPage })
    }

    // devStore fallback
    const regs = devStore.getAll<any>('registrations').filter((r) => r.eventId === eventId)
    const users = devStore.getAll<any>('users')
    const joined = regs
      .map((r) => ({ ...r, user: users.find((u) => u.id === r.userId) || null }))
      .filter((r) => {
        if (!q) return true
        const name = r.user?.name?.toLowerCase() || ''
        const email = r.user?.email?.toLowerCase() || ''
        return name.includes(q) || email.includes(q) || (r.userId || '').toLowerCase().includes(q)
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    const total = joined.length
    const items = joined.slice((page - 1) * perPage, (page - 1) * perPage + perPage)
    return NextResponse.json({ items, total, page, perPage })
  } catch (e) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /portal/api/events/[id]/registrations
 * Body: { userId: string }
 */
export async function POST(req: Request, context: any) {
  try {
    const eventId = context.params?.id as string
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.registration.create({
        data: { eventId, userId },
        include: { user: true },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // devStore fallback
    const created = devStore.upsert('registrations', {
      id: undefined,
      eventId,
      userId,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 })
  }
}