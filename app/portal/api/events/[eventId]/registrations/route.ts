export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const { eventId } = (context?.params ?? {}) as { eventId: string }
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const regs = await prisma.registration.findMany({
        where: { eventId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(regs)
    }

    const regs = devStore.getAll<any>('registrations').filter((r) => r.eventId === eventId)
    return NextResponse.json(regs)
  } catch (e: any) {
    console.error('GET /portal/api/events/[eventId]/registrations failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { eventId } = (context?.params ?? {}) as { eventId: string }
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      // Ensure user exists (dev convenience)
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId, email: `${userId}@dev.local`, name: 'Dev User' },
        update: {},
      })

      // If registration exists, return it; otherwise create a new one
      const existing = await prisma.registration.findFirst({
        where: { eventId, userId },
        select: { id: true },
      })

      if (existing) {
        const reg = await prisma.registration.findUnique({ where: { id: existing.id } })
        return NextResponse.json(reg, { status: 200 })
      }

      const reg = await prisma.registration.create({ data: { eventId, userId } })
      return NextResponse.json(reg, { status: 201 })
    }

    // devStore fallback (local only)
    const already = devStore.getAll<any>('registrations')
      .find((r) => r.eventId === eventId && r.userId === userId)
    if (already) return NextResponse.json(already, { status: 200 })

    const created = devStore.upsert('registrations', {
      eventId, userId, status: 'CONFIRMED', // harmless local-only field
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[eventId]/registrations failed:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}