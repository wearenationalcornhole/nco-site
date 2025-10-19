// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

type UserDb = {
  id: string
  email: string
  name?: string | null
}

type RowDb = {
  id?: string
  event_id: string
  user_id: string
  created_at: string | Date | null
}

type Row = {
  id: string
  eventId: string
  userId: string
  createdAt: string | null
  user?: { id: string; email?: string | null; name?: string | null } | null
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function toApiRow(r: RowDb, user?: UserDb | null): Row {
  return {
    id: r.id!, // set by prisma or devStore
    eventId: r.event_id,
    userId: r.user_id,
    createdAt: asIso(r.created_at),
    user: user ? { id: user.id, email: user.email, name: user.name ?? null } : null,
  }
}

/* ─────────────────────────────────────────────────────────────
   GET /portal/api/events/:id/registrations
   ───────────────────────────────────────────────────────────── */

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()

    if (prisma) {
      const regs = (await prisma.registrations.findMany({
        where: { event_id: id },
        orderBy: { created_at: 'desc' },
      })) as unknown as RowDb[]

      // fetch users for mapping (1 query)
      const userIds = Array.from(new Set(regs.map((r) => r.user_id)))
      const users =
        userIds.length > 0
          ? ((await prisma.users.findMany({
              where: { id: { in: userIds } },
              select: { id: true, email: true, name: true },
            })) as unknown as UserDb[])
          : []
      const userMap = new Map(users.map((u) => [u.id, u]))

      return NextResponse.json(regs.map((r) => toApiRow(r, userMap.get(r.user_id))))
    }

    // devStore fallback
    const regs = devStore
      .getAll<RowDb>('registrations')
      .filter((r) => r.event_id === id)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

    // build user map from devStore
    const userIds = Array.from(new Set(regs.map((r) => r.user_id)))
    const users = devStore.getAll<UserDb>('users').filter((u) => userIds.includes(u.id))
    const userMap = new Map(users.map((u) => [u.id, u]))

    return NextResponse.json(regs.map((r) => toApiRow(r, userMap.get(r.user_id))))
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────────────────────
   POST /portal/api/events/:id/registrations
   Body: { email: string, name?: string }
   - find or create user by email
   - ensure not already registered for event
   - create registration
   ───────────────────────────────────────────────────────────── */

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))

    const email = String(body?.email ?? '').trim().toLowerCase()
    const name = body?.name ? String(body.name).trim() : undefined

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const prisma = await getPrisma()

    if (prisma) {
      // find or create user
      let user = (await prisma.users.findFirst({
        where: { email },
        select: { id: true, email: true, name: true },
      })) as unknown as UserDb | null

      if (!user) {
        user = (await prisma.users.create({
          data: {
            email,
            ...(name ? { name } : {}),
          },
          select: { id: true, email: true, name: true },
        })) as unknown as UserDb
      } else if (name && !user.name) {
        // optional: backfill name if empty
        await prisma.users.update({
          where: { id: user.id },
          data: { name },
        })
        user = { ...user, name }
      }

      // prevent duplicate registration
      const existing = await prisma.registrations.findFirst({
        where: { event_id: id, user_id: user.id },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Player already registered for this event' },
          { status: 409 }
        )
      }

      // create registration
      const created = (await prisma.registrations.create({
        data: {
          event_id: id,
          user_id: user.id,
        },
      })) as unknown as RowDb

      return NextResponse.json(toApiRow(created, user), { status: 201 })
    }

    // devStore fallback
    // find or create user
    let user = devStore.getAll<UserDb>('users').find((u) => u.email.toLowerCase() === email) || null
    if (!user) {
      user = devStore.upsert<UserDb>('users', {
        email,
        name: name ?? null,
      } as any) // id will be generated by devStore
    } else if (name && !user.name) {
      user = devStore.upsert<UserDb>('users', { ...user, name })
    }

    // prevent duplicate registration
    const existing = devStore
      .getAll<RowDb>('registrations')
      .find((r) => r.event_id === id && r.user_id === user.id)
    if (existing) {
      return NextResponse.json(
        { error: 'Player already registered for this event' },
        { status: 409 }
      )
    }

    // create registration
    const created = devStore.upsert<RowDb>('registrations', {
      event_id: id,
      user_id: user.id,
      created_at: new Date(),
    })

    return NextResponse.json(toApiRow(created, user), { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}