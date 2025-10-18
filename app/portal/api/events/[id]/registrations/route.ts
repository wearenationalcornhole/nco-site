// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * GET → list registrations for an event (joined with user)
 */
export async function GET(_req: Request, ctx: any) {
  try {
    const eventId = ctx.params?.id as string
    if (!eventId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const regs = await prisma.registration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, eventId: true, userId: true, createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
      return NextResponse.json(regs)
    }

    // dev fallback
    const regs = devStore.getAll<any>('registrations')
      .filter((r) => r.eventId === eventId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .map((r) => ({
        ...r,
        user: devStore.getById<any>('users', r.userId) ?? null,
      }))

    return NextResponse.json(regs)
  } catch (e: any) {
    console.error('GET /registrations failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST → add a registration
 * Accepts: { userId? , email? , name? }
 * - If email is provided and user doesn’t exist → create the user (with optional name).
 */
export async function POST(req: Request, ctx: any) {
  try {
    const eventId = ctx.params?.id as string
    if (!eventId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { userId, email, name } = await req.json()

    const prisma = await getPrisma()
    if (prisma) {
      let uid = userId as string | undefined

      if (!uid) {
        if (!email) return NextResponse.json({ error: 'userId or email required' }, { status: 400 })
        // find-or-create user by email
        const existing = await prisma.user.findUnique({ where: { email } })
        const user = existing ?? (await prisma.user.create({ data: { email, name: name || null } }))
        uid = user.id
      }

      const created = await prisma.registration.create({
        data: { eventId, userId: uid! },
        select: {
          id: true, eventId: true, userId: true, createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // dev fallback
    let uid = userId as string | undefined
    if (!uid) {
      if (!email) return NextResponse.json({ error: 'userId or email required' }, { status: 400 })
      const all = devStore.getAll<any>('users')
      let user = all.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
      if (!user) {
        user = devStore.upsert('users', {
          email,
          name: name || null,
          createdAt: new Date().toISOString(),
        })
      }
      uid = user.id
    }

    const created = devStore.upsert('registrations', {
      eventId,
      userId: uid!,
      createdAt: new Date().toISOString(),
    })

    // attach user for UI convenience
    const user = devStore.getById<any>('users', uid!)
    return NextResponse.json({ ...created, user }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}