// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// Shape we return to the client
type Row = {
  id: string
  eventId: string
  userId: string
  createdAt: string | null
  // Optional: user info if/when you join users later
  user?: { id: string; name?: string | null; email?: string | null } | null
}

// Shape we read from DB/devStore (snake_case columns)
type RowDb = {
  id: string
  event_id: string
  user_id: string
  created_at: string | null
  // Optional user join (not required now)
  user?: { id: string; name?: string | null; email?: string | null } | null
}

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()

    if (prisma) {
      // If you have a relation to users in your Prisma schema, you can include it:
      // const rows = await prisma.registrations.findMany({
      //   where: { event_id: id },
      //   orderBy: { created_at: 'desc' },
      //   include: { user: true }, // adjust to your relation name
      // })

      const rows = (await prisma.registrations.findMany({
        where: { event_id: id },
        orderBy: { created_at: 'desc' },
      })) as unknown as RowDb[]

      const out: Row[] = rows.map((r: RowDb) => ({
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id,
        createdAt: r.created_at,
        user: r.user ?? null,
      }))

      return NextResponse.json(out)
    }

    // devStore fallback
    const rows = devStore
      .getAll<RowDb>('registrations')
      .filter((r) => r.event_id === id)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

    const out: Row[] = rows.map((r: RowDb) => ({
      id: r.id,
      eventId: r.event_id,
      userId: r.user_id,
      createdAt: r.created_at,
      user: r.user ?? null,
    }))

    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = (await prisma.registrations.create({
        data: {
          event_id: id,
          user_id: userId,
          // created_at uses DB default now()
        },
      })) as unknown as RowDb

      const out: Row = {
        id: created.id,
        eventId: created.event_id,
        userId: created.user_id,
        createdAt: created.created_at,
        user: null,
      }
      return NextResponse.json(out, { status: 201 })
    }

    // devStore fallback
    const created = devStore.upsert<RowDb>('registrations', {
      event_id: id,
      user_id: userId,
      created_at: new Date().toISOString(),
    })

    const out: Row = {
      id: created.id,
      eventId: created.event_id,
      userId: created.user_id,
      createdAt: created.created_at,
      user: null,
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}