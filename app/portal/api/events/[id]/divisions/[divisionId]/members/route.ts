// app/portal/api/events/[id]/divisions/[divisionId]/members/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// What we send to the client
type Row = {
  user_id: string
  user?: { id: string; name?: string | null; email?: string | null } | null
  created_at: string | null
}

// How we store it locally / receive from DB
type RowDb = {
  id?: string
  event_id: string
  division_id: string
  user_id: string
  created_at: string | Date | null
  user?: { id: string; name?: string | null; email?: string | null } | null
}

function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

/* ─────────────────────────────────────────────────────────────
   GET: List members for a division
   /portal/api/events/:id/divisions/:divisionId/members
   ───────────────────────────────────────────────────────────── */
export async function GET(_req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const prisma = await getPrisma()

    if (prisma) {
      // If/when you add a user relation in Prisma, you can include it here.
      const rows = (await prisma.event_division_members.findMany({
        where: { event_id: eventId, division_id: divisionId },
        orderBy: { created_at: 'desc' },
        // include: { user: true },
      })) as unknown as RowDb[]

      const out: Row[] = rows.map((r) => ({
        user_id: r.user_id,
        created_at: asIso(r.created_at),
        user: r.user ?? null,
      }))
      return NextResponse.json(out)
    }

    // devStore fallback
    const rows = devStore
      .getAll<RowDb>('event_division_members')
      .filter((r) => r.event_id === eventId && r.division_id === divisionId)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

    const out: Row[] = rows.map((r) => ({
      user_id: r.user_id,
      created_at: asIso(r.created_at),
      user: r.user ?? null,
    }))
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET division members error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────────────────────
   POST: Add a member
   body: { userId: string }
   /portal/api/events/:id/divisions/:divisionId/members
   ───────────────────────────────────────────────────────────── */
export async function POST(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()

    if (prisma) {
      // Optional: prevent duplicates
      const exists = await prisma.event_division_members.findFirst({
        where: { event_id: eventId, division_id: divisionId, user_id: userId },
      })
      if (exists) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

      const created = (await prisma.event_division_members.create({
        data: { event_id: eventId, division_id: divisionId, user_id: userId },
      })) as unknown as RowDb

      const out: Row = {
        user_id: created.user_id,
        created_at: asIso(created.created_at),
        user: null,
      }
      return NextResponse.json(out, { status: 201 })
    }

    // devStore fallback — check dup
    const dup = devStore
      .getAll<RowDb>('event_division_members')
      .some((r) => r.event_id === eventId && r.division_id === divisionId && r.user_id === userId)
    if (dup) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

    const created = devStore.upsert<RowDb>('event_division_members', {
      event_id: eventId,
      division_id: divisionId,
      user_id: userId,
      created_at: new Date(),
    })

    const out: Row = {
      user_id: created.user_id,
      created_at: asIso(created.created_at),
      user: null,
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST division members error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

/* ─────────────────────────────────────────────────────────────
   DELETE: Remove member
   query: ?userId=123
   /portal/api/events/:id/divisions/:divisionId/members?userId=...
   ───────────────────────────────────────────────────────────── */
export async function DELETE(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const { searchParams } = new URL(req.url)
    const userId = String(searchParams.get('userId') ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()

    if (prisma) {
      const result = await prisma.event_division_members.deleteMany({
        where: { event_id: eventId, division_id: divisionId, user_id: userId },
      })
      if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    // devStore fallback
    const all = devStore.getAll<RowDb>('event_division_members')
    const before = all.length
    const remaining = all.filter(
      (r) => !(r.event_id === eventId && r.division_id === divisionId && r.user_id === userId)
    )
    if (remaining.length === before) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Replace table contents
    ;(devStore as any).reset // not needed; mutate directly
    ;(devStore.getAll as any) // no-op, just to satisfy TS reference

    // quick replace using private API: remove() per id is awkward (no composite key), so reassign
    ;(globalThis as any).__NCO_DEV_STORE__.event_division_members = remaining
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE division member error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}