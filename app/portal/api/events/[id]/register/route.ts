export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { createServerClient } from '@/app/lib/supabaseServer'

type RowOut = {
  id: string
  eventId: string
  userId: string
  createdAt: string | null
}

function asIso(d: string | Date | null) {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function POST(_req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }

    // Require session
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const email = session.user.email ?? null
    const name =
      (session.user.user_metadata?.full_name as string | undefined) ??
      (session.user.user_metadata?.name as string | undefined) ??
      null

    const prisma = await getPrisma()

    if (prisma) {
      // Ensure a users row exists for this auth user
      await prisma.users.upsert({
        where: { id: userId },
        update: { email: email ?? undefined, name: name ?? undefined },
        create: {
          id: userId,
          email: email ?? `user-${userId}@example.com`,
          name: name ?? null,
        },
      })

      // Avoid duplicate registration
      const existing = await prisma.registrations.findFirst({
        where: { event_id: eventId, user_id: userId },
      })
      if (existing) {
        return NextResponse.json(
          {
            id: existing.id,
            eventId: existing.event_id,
            userId: existing.user_id,
            createdAt: asIso(existing.created_at),
          } satisfies RowOut,
          { status: 200 },
        )
      }

      const created = await prisma.registrations.create({
        data: { event_id: eventId, user_id: userId },
      })

      return NextResponse.json(
        {
          id: created.id,
          eventId: created.event_id,
          userId: created.user_id,
          createdAt: asIso(created.created_at),
        } satisfies RowOut,
        { status: 201 },
      )
    }

    // ───────── devStore fallback (no Prisma) ─────────
    // Ensure dev users record
    const userRow =
      devStore.getById('users', userId) ??
      devStore.upsert('users', {
        id: userId,
        email: email ?? `user-${userId}@example.com`,
        name: name ?? null,
      })

    // Prevent duplicate registration
    const existing = devStore
      .getAll('registrations')
      .find((r) => r.event_id === eventId && r.user_id === userRow.id)

    if (existing) {
      return NextResponse.json(
        {
          id: existing.id!,
          eventId: existing.event_id,
          userId: existing.user_id,
          createdAt: asIso(existing.created_at),
        } satisfies RowOut,
        { status: 200 },
      )
    }

    const created = devStore.upsert('registrations', {
      event_id: eventId,
      user_id: userRow.id,
      created_at: new Date(),
    })

    return NextResponse.json(
      {
        id: created.id!,
        eventId: created.event_id,
        userId: created.user_id,
        createdAt: asIso(created.created_at),
      } satisfies RowOut,
      { status: 201 },
    )
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/register error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}