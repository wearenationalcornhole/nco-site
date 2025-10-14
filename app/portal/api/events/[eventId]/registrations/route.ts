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
      try {
        const regs = await prisma.registration.findMany({
          where: { eventId },
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(regs, { status: 200 })
      } catch (e) {
        console.error('Prisma regs list failed, falling back:', e)
      }
    }
    const regs = devStore.getAll<any>('registrations').filter((r) => r.eventId === eventId)
    return NextResponse.json(regs, { status: 200 })
  } catch (e) {
    console.error('GET /portal/api/events/[eventId]/registrations fail:', e)
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
      try {
        await prisma.user.upsert({
          where: { id: userId },
          create: { id: userId, email: `${userId}@dev.local`, name: 'Dev User' },
          update: {},
        })
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
      } catch (e) {
        console.error('Prisma regs create failed, falling back:', e)
      }
    }

    const already = devStore.getAll<any>('registrations')
      .find((r) => r.eventId === eventId && r.userId === userId)
    if (already) return NextResponse.json(already, { status: 200 })

    const created = devStore.upsert('registrations', { eventId, userId, status: 'CONFIRMED' })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[eventId]/registrations fail:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}