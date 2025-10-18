// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type DevUser = { id: string; email: string; name?: string | null }
type DevReg = {
  id?: string
  eventId: string
  userId: string
  createdAt?: string
  status?: 'Registered' | 'Paid' | 'Waitlisted' | 'Checked-In' | 'No-Show'
  notes?: string
  user?: DevUser | null
}

const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s)

export async function GET(_req: Request, context: any) {
  try {
    const { id: eventId } = (await context.params) as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      const rows = await prisma.registration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      })
      return NextResponse.json(rows)
    }

    // devStore fallback (decorate with user)
    const regs = devStore.getAll<DevReg>('registrations').filter(r => r.eventId === eventId)
    const users = devStore.getAll<DevUser>('users')
    const withUsers = regs.map(r => ({ ...r, user: users.find(u => u.id === r.userId) ?? null }))
    return NextResponse.json(withUsers)
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id: eventId } = (await context.params) as { id: string }
    const payload = await req.json() as { userId?: string; email?: string; name?: string; status?: DevReg['status']; notes?: string }

    const prisma = await getPrisma()
    if (prisma) {
      // Option A: userId provided
      if (payload.userId) {
        const created = await prisma.registration.create({
          data: { eventId, userId: payload.userId },
          include: { user: true },
        })
        return NextResponse.json(created, { status: 201 })
      }

      // Option B: email (create or find user)
      if (payload.email && isEmail(payload.email)) {
        // best-effort find-or-create
        let user = await prisma.user.findUnique({ where: { email: payload.email } }).catch(() => null)
        if (!user) {
          user = await prisma.user.create({
            data: { email: payload.email, name: payload.name || null },
          })
        }
        const created = await prisma.registration.create({
          data: { eventId, userId: user.id },
          include: { user: true },
        })
        return NextResponse.json(created, { status: 201 })
      }

      return NextResponse.json({ error: 'Provide userId OR a valid email' }, { status: 400 })
    }

    // ── devStore fallback ───────────────────────────────────────
    let userId = payload.userId
    let user: DevUser | undefined

    if (!userId) {
      if (!payload.email || !isEmail(payload.email)) {
        return NextResponse.json({ error: 'Provide userId OR a valid email' }, { status: 400 })
      }
      const allUsers = devStore.getAll<DevUser>('users')
      user = allUsers.find(u => u.email.toLowerCase() === payload.email!.toLowerCase())
      if (!user) {
        user = devStore.upsert<DevUser>('users', {
          id: crypto.randomUUID(),
          email: payload.email,
          name: payload.name || null,
        })
      }
      userId = user.id
    } else {
      // if a userId is given, try to attach a known user
      const allUsers = devStore.getAll<DevUser>('users')
      user = allUsers.find(u => u.id === userId)
    }

    const created = devStore.upsert<DevReg>('registrations', {
      id: crypto.randomUUID(),
      eventId,
      userId,
      status: payload.status ?? 'Registered',
      notes: payload.notes ?? '',
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ...created, user: user ?? null }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const { id: eventId } = (await context.params) as { id: string }
    const { id, status, notes } = await req.json() as { id: string; status?: DevReg['status']; notes?: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      // If your Prisma model doesn’t have status/notes yet, we just return the row.
      const updated = await prisma.registration.update({
        where: { id },
        data: {},
        include: { user: true },
      })
      if (updated.eventId !== eventId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(updated)
    }

    const all = devStore.getAll<DevReg>('registrations')
    const idx = all.findIndex(r => r.id === id && r.eventId === eventId)
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const merged = devStore.upsert<DevReg>('registrations', {
      ...all[idx],
      ...(typeof status !== 'undefined' ? { status } : {}),
      ...(typeof notes !== 'undefined' ? { notes } : {}),
    })
    const user = devStore.getById<DevUser>('users', merged.userId) ?? null
    return NextResponse.json({ ...merged, user })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const { id: eventId } = (await context.params) as { id: string }
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const existing = await prisma.registration.findUnique({ where: { id } })
      if (!existing || existing.eventId !== eventId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await prisma.registration.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    const ok = devStore.remove('registrations', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}