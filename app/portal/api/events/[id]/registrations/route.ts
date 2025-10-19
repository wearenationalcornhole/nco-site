// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// Shared shape we return to the client
type Row = {
  id?: string
  eventId: string
  userId: string
  createdAt?: string
  user?: { id: string; email?: string | null; name?: string | null } | null
}

/* GET
   List registrations for an event (joined with basic user info) */
export async function GET(_req: Request, context: any) {
  try {
    const eventId = context?.params?.id as string
    if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const rows = await prisma.registrations.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      })

      const out: Row[] = rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id,
        createdAt: r.created_at?.toISOString?.() ?? null as any,
        user: r.user ? { id: r.user.id, email: r.user.email, name: r.user.name } : null,
      }))

      return NextResponse.json(out)
    }

    // devStore fallback
    const regs = devStore
      .getAll<any>('registrations')
      .filter((r) => r.event_id === eventId)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

    const users = devStore.getAll<any>('users')
    const out: Row[] = regs.map((r) => {
      const u = users.find((x) => x.id === r.user_id)
      return {
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id,
        createdAt: r.created_at,
        user: u ? { id: u.id, email: u.email ?? null, name: u.name ?? null } : null,
      }
    })
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* POST
   Add a registration.
   Payload options:
   - { email, name? }  -> upsert user by email, then register
   - { userId }        -> register existing user id
*/
export async function POST(req: Request, context: any) {
  try {
    const eventId = context?.params?.id as string
    if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

    const payload = await req.json().catch(() => ({}))
    const email = (payload?.email ?? '').trim()
    const name = (payload?.name ?? '').trim()
    const providedUserId = (payload?.userId ?? '').trim()

    let finalUserId = providedUserId

    const prisma = await getPrisma()
    if (prisma) {
      // Resolve user (by email or given id)
      if (email) {
        // Upsert by unique email
        const user = await prisma.users.upsert({
          where: { email },
          update: name ? { name } : {},
          create: { email, name: name || null },
        })
        finalUserId = user.id
      } else if (!finalUserId) {
        return NextResponse.json({ error: 'Provide email or userId' }, { status: 400 })
      }

      // Avoid duplicate registration
      const existing = await prisma.registrations.findFirst({
        where: { event_id: eventId, user_id: finalUserId },
      })
      const created =
        existing ??
        (await prisma.registrations.create({
          data: { event_id: eventId, user_id: finalUserId },
        }))

      // Join user
      const user =
        existing
          ? await prisma.users.findUnique({ where: { id: existing.user_id } })
          : await prisma.users.findUnique({ where: { id: created.user_id } })

      const out: Row = {
        id: created.id,
        eventId: created.event_id,
        userId: created.user_id,
        createdAt: created.created_at?.toISOString?.() ?? null as any,
        user: user ? { id: user.id, email: user.email, name: user.name } : null,
      }
      return NextResponse.json(out, { status: existing ? 200 : 201 })
    }

    // devStore fallback
    if (email) {
      // find or create user by email
      let user = devStore.getAll<any>('users').find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
      if (!user) {
        user = devStore.upsert('users', {
          email,
          name: name || null,
          created_at: new Date().toISOString(),
        })
      } else if (name && !user.name) {
        user = devStore.upsert('users', { ...user, name })
      }
      finalUserId = user.id
    } else if (!finalUserId) {
      return NextResponse.json({ error: 'Provide email or userId' }, { status: 400 })
    }

    const regs = devStore.getAll<any>('registrations')
    const dup = regs.find((r) => r.event_id === eventId && r.user_id === finalUserId)
    const created = dup
      ? dup
      : devStore.upsert('registrations', {
          event_id: eventId,
          user_id: finalUserId,
          created_at: new Date().toISOString(),
        })

    const user = devStore.getById<any>('users', created.user_id)
    const out: Row = {
      id: created.id,
      eventId: created.event_id,
      userId: created.user_id,
      createdAt: created.created_at,
      user: user ? { id: user.id, email: user.email ?? null, name: user.name ?? null } : null,
    }
    return NextResponse.json(out, { status: dup ? 200 : 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

/* DELETE
   Remove a registration.
   Accepts either:
   - ?registrationId=xxx
   - ?userId=yyy   (removes that user’s registration for this event)
*/
export async function DELETE(req: Request, context: any) {
  try {
    const eventId = context?.params?.id as string
    if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

    const url = new URL(req.url)
    const registrationId = url.searchParams.get('registrationId') ?? undefined
    const userId = url.searchParams.get('userId') ?? undefined

    if (!registrationId && !userId) {
      return NextResponse.json({ error: 'Provide registrationId or userId' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      if (registrationId) {
        await prisma.registrations.delete({ where: { id: registrationId } })
      } else if (userId) {
        const existing = await prisma.registrations.findFirst({
          where: { event_id: eventId, user_id: userId },
        })
        if (!existing) return NextResponse.json({ ok: true }) // idempotent
        await prisma.registrations.delete({ where: { id: existing.id } })
      }
      return NextResponse.json({ ok: true })
    }

    // devStore fallback
    if (registrationId) {
      devStore.remove('registrations', registrationId)
    } else if (userId) {
      const all = devStore.getAll<any>('registrations')
      const match = all.find((r) => r.event_id === eventId && r.user_id === userId)
      if (match?.id) devStore.remove('registrations', match.id)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}