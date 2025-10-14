import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params
  const prisma = getPrisma()
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
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = getPrisma()
    if (prisma) {
      // Ensure user exists (dev convenience)
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId, email: `${userId}@dev.local`, name: 'Dev User' },
        update: {},
      })

      // Find existing registration
      const existing = await prisma.registration.findFirst({
        where: { eventId, userId },
        select: { id: true },
      })

      if (existing) {
        // Already registered — return the existing row
        const reg = await prisma.registration.findUnique({ where: { id: existing.id } })
        return NextResponse.json(reg, { status: 200 })
      }

      // Create minimal registration (no status field)
      const reg = await prisma.registration.create({
        data: { eventId, userId },
      })
      return NextResponse.json(reg, { status: 201 })
    }

    // devStore fallback (local dev)
    const already = devStore.getAll<any>('registrations')
      .find((r) => r.eventId === eventId && r.userId === userId)
    if (already) return NextResponse.json(already, { status: 200 })

    const created = devStore.upsert('registrations', {
      eventId, userId, status: 'CONFIRMED', // harmless extra field in local-only store
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}