// app/portal/api/events/[id]/divisions/[divisionId]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Division = {
  id: string
  eventId: string
  name: string
  cap: number | null
  createdAt: string | null
}

type DivisionRow = {
  id?: string
  event_id: string
  name: string
  cap: number | null
  created_at: string | Date | null
}

function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

// GET /portal/api/events/:id/divisions/:divisionId
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { id: eventId, divisionId } = await ctx.params
    const prisma = await getPrisma()

    if (prisma) {
      const row = (await prisma.event_divisions.findUnique({
        where: { id: divisionId },
      })) as unknown as DivisionRow | null

      if (!row || row.event_id !== eventId) {
        return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      }

      const out: Division = {
        id: row.id!,
        eventId: row.event_id,
        name: row.name,
        cap: row.cap,
        createdAt: asIso(row.created_at),
      }
      return NextResponse.json(out)
    }

    // dev fallback
    const d = devStore
      .getAll<DivisionRow>('event_divisions' as any)
      .find((r) => r.id === divisionId && r.event_id === eventId)

    if (!d) return NextResponse.json({ error: 'Division not found' }, { status: 404 })

    const out: Division = {
      id: d.id!,
      eventId: d.event_id,
      name: d.name,
      cap: d.cap,
      createdAt: asIso(d.created_at),
    }
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET division error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /portal/api/events/:id/divisions/:divisionId
// body: { name?: string; cap?: number | null }
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { id: eventId, divisionId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined
    const cap =
      body?.cap === null
        ? null
        : typeof body?.cap === 'number'
        ? body.cap
        : undefined // not provided

    const prisma = await getPrisma()
    if (prisma) {
      const existing = (await prisma.event_divisions.findUnique({
        where: { id: divisionId },
      })) as any

      if (!existing || existing.event_id !== eventId) {
        return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      }

      const updated = (await prisma.event_divisions.update({
        where: { id: divisionId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(cap !== undefined ? { cap } : {}),
        },
      })) as unknown as DivisionRow

      const out: Division = {
        id: updated.id!,
        eventId: updated.event_id,
        name: updated.name,
        cap: updated.cap,
        createdAt: asIso(updated.created_at),
      }
      return NextResponse.json(out)
    }

    // dev fallback
    const all = devStore.getAll<DivisionRow>('event_divisions' as any)
    const idx = all.findIndex((r) => r.id === divisionId && r.event_id === eventId)
    if (idx < 0) return NextResponse.json({ error: 'Division not found' }, { status: 404 })

    const updated: DivisionRow = {
      ...all[idx],
      ...(name !== undefined ? { name } : {}),
      ...(cap !== undefined ? { cap } : {}),
    }
    devStore.upsert<DivisionRow>('event_divisions' as any, updated)

    const out: Division = {
      id: updated.id!,
      eventId: updated.event_id,
      name: updated.name,
      cap: updated.cap,
      createdAt: asIso(updated.created_at),
    }
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('PATCH division error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

// DELETE /portal/api/events/:id/divisions/:divisionId
// also removes related assignments/members to keep things tidy
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { id: eventId, divisionId } = await ctx.params
    const prisma = await getPrisma()

    if (prisma) {
      const existing = await prisma.event_divisions.findUnique({ where: { id: divisionId } })
      if (!existing || (existing as any).event_id !== eventId) {
        return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      }

      // clean up related rows first (optional but nice)
      await prisma.division_assignments.deleteMany({
        where: { division_id: divisionId, event_id: eventId },
      })
      await prisma.event_division_members.deleteMany({
        where: { division_id: divisionId, event_id: eventId },
      })
      await prisma.event_divisions.delete({ where: { id: divisionId } })
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    devStore.remove('event_divisions' as any, divisionId)

    // cleanup related devStore rows
    devStore
      .getAll<any>('division_assignments' as any)
      .filter((a) => a.event_id === eventId && a.division_id === divisionId)
      .forEach((a) => a?.id && devStore.remove('division_assignments' as any, a.id))

    devStore
      .getAll<any>('event_division_members' as any)
      .filter((m) => m.event_id === eventId && m.division_id === divisionId)
      .forEach((m) => m?.id && devStore.remove('event_division_members' as any, m.id))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE division error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}