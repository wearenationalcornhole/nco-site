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

/* ─────────────────────────────────────────────────────────────
   PATCH: update division
   body: { name?: string, cap?: number | null }
   /portal/api/events/:id/divisions/:divisionId
   ───────────────────────────────────────────────────────────── */
export async function PATCH(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({}))

    const updates: { name?: string; cap?: number | null } = {}

    if (body?.name !== undefined) {
      const nm = String(body.name).trim()
      if (!nm) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      updates.name = nm
    }

    if (body?.cap !== undefined) {
      const raw = body.cap
      const cap = raw === null || raw === '' ? null : Number(raw)
      if (cap !== null && (Number.isNaN(cap) || cap < 0)) {
        return NextResponse.json({ error: 'cap must be a non-negative number or null' }, { status: 400 })
      }
      updates.cap = cap
    }

    const prisma = await getPrisma()

    if (prisma) {
      const found = await prisma.event_divisions.findFirst({
        where: { id: divisionId, event_id: eventId },
      })
      if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = (await prisma.event_divisions.update({
        where: { id: divisionId },
        data: updates,
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
    const all = devStore.getAll<DivisionRow>('event_divisions')
    const curr = all.find((r) => r.id === divisionId && r.event_id === eventId)
    if (!curr) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const saved = devStore.upsert<DivisionRow>('event_divisions', {
      ...curr,
      ...updates,
    })

    const out: Division = {
      id: saved.id!,
      eventId: saved.event_id,
      name: saved.name,
      cap: saved.cap,
      createdAt: asIso(saved.created_at),
    }
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('PATCH division error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

/* ─────────────────────────────────────────────────────────────
   DELETE: remove division
   /portal/api/events/:id/divisions/:divisionId
   - In Prisma: delete members first to avoid FK constraint, then the division
   - In devStore: filter them out manually
   ───────────────────────────────────────────────────────────── */
export async function DELETE(_req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const prisma = await getPrisma()

    if (prisma) {
      // Remove members first to avoid FK errors
      await prisma.event_division_members.deleteMany({
        where: { event_id: eventId, division_id: divisionId },
      })

      const result = await prisma.event_divisions.deleteMany({
        where: { id: divisionId, event_id: eventId },
      })
      if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const divs = devStore.getAll<DivisionRow>('event_divisions')
    const before = divs.length
    ;(globalThis as any).__NCO_DEV_STORE__.event_divisions = divs.filter(
      (r: DivisionRow) => !(r.id === divisionId && r.event_id === eventId)
    )

    // also clear members
    const members = devStore.getAll<any>('event_division_members')
    ;(globalThis as any).__NCO_DEV_STORE__.event_division_members = members.filter(
      (m: any) => !(m.event_id === eventId && m.division_id === divisionId)
    )

    const after = (globalThis as any).__NCO_DEV_STORE__.event_divisions.length
    if (after === before) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE division error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}