// app/portal/api/events/[id]/divisions/[divisionId]/members/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** Public shape returned to client */
type Member = {
  id: string
  eventId: string
  divisionId: string
  userId: string
  createdAt: string | null
}

/** DB/dev shape (snake_case) */
type MemberRow = {
  id?: string
  event_id: string
  division_id: string
  user_id: string
  created_at: string | Date | null
}

function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

/**
 * GET /portal/api/events/:id/divisions/:divisionId/members
 * -> List members in a division
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { id: eventId, divisionId } = await ctx.params
    const prisma = await getPrisma()

    if (prisma) {
      const rows = (await prisma.event_division_members.findMany({
        where: { event_id: eventId, division_id: divisionId },
        orderBy: { created_at: 'desc' },
      })) as unknown as MemberRow[]

      const out: Member[] = rows.map((r) => ({
        id: r.id!,
        eventId: r.event_id,
        divisionId: r.division_id,
        userId: r.user_id,
        createdAt: asIso(r.created_at),
      }))
      return NextResponse.json(out)
    }

    // dev fallback
    const rows = devStore
      .getAll<MemberRow>('event_division_members' as any)
      .filter((r) => r.event_id === eventId && r.division_id === divisionId)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

    const out: Member[] = rows.map((r) => ({
      id: r.id!,
      eventId: r.event_id,
      divisionId: r.division_id,
      userId: r.user_id,
      createdAt: asIso(r.created_at),
    }))
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET division members error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /portal/api/events/:id/divisions/:divisionId/members
 * body: { userId: string }
 * -> Add a user to a division
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { id: eventId, divisionId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? '').trim()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const created = (await prisma.event_division_members.create({
        data: { event_id: eventId, division_id: divisionId, user_id: userId },
      })) as unknown as MemberRow

      const out: Member = {
        id: created.id!,
        eventId: created.event_id,
        divisionId: created.division_id,
        userId: created.user_id,
        createdAt: asIso(created.created_at),
      }
      return NextResponse.json(out, { status: 201 })
    }

    // dev fallback — omit id so devStore generates one
    const created = devStore.upsert<MemberRow>('event_division_members' as any, {
      event_id: eventId,
      division_id: divisionId,
      user_id: userId,
      created_at: new Date(),
    })

    const out: Member = {
      id: created.id!,
      eventId: created.event_id,
      divisionId: created.division_id,
      userId: created.user_id,
      createdAt: asIso(created.created_at),
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST division members error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

/**
 * DELETE /portal/api/events/:id/divisions/:divisionId/members?memberId=... | ?userId=...
 * -> Remove a user from the division (prefer memberId; fallback to userId)
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { id: eventId, divisionId } = await ctx.params
    const url = new URL(req.url)
    const memberId = url.searchParams.get('memberId')
    const userId = url.searchParams.get('userId')

    if (!memberId && !userId) {
      return NextResponse.json(
        { error: 'memberId or userId is required' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()
    if (prisma) {
      if (memberId) {
        await prisma.event_division_members.delete({ where: { id: memberId } })
      } else {
        await prisma.event_division_members.deleteMany({
          where: { event_id: eventId, division_id: divisionId, user_id: userId! },
        })
      }
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    if (memberId) {
      devStore.remove('event_division_members' as any, memberId)
    } else {
      const all = devStore.getAll<MemberRow>('event_division_members' as any)
      const toRemove = all.find(
        (r) =>
          r.event_id === eventId &&
          r.division_id === divisionId &&
          r.user_id === userId
      )
      if (toRemove?.id) devStore.remove('event_division_members' as any, toRemove.id)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE division member error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}