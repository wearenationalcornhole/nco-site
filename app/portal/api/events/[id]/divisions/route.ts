// app/portal/api/events/[id]/divisions/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type DivisionRow = {
  id?: string
  event_id: string
  name: string
  cap: number | null
  created_at: string | Date | null
}

type DivisionAssignmentRow = {
  id?: string
  event_id: string
  division_id: string
  user_id?: string
  status?: 'assigned' | 'waitlisted'
  created_at?: string | Date | null
}

function asIso(d: string | Date | null) {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

/** GET /portal/api/events/[id]/divisions
 *  Returns the event's divisions, with a lightweight assignedCount (dev fallback).
 */
export async function GET(_req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }
    const prisma = await getPrisma()

    // If Prisma is available, return divisions from DB (counts optional / 0 if not modeled yet)
    if (prisma) {
      const rows = (await prisma.event_divisions.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
      })) as unknown as DivisionRow[]

      // If you later add a division_assignments table in Prisma, compute counts here.
      const out = rows.map((d) => ({
        id: d.id!,
        eventId: d.event_id,
        name: d.name,
        cap: d.cap,
        createdAt: asIso(d.created_at),
        assignedCount: 0, // update when DB model exists
      }))

      return NextResponse.json(out)
    }

    // Dev fallback (in-memory)
    const divisions = devStore
      .getAll<DivisionRow>('event_divisions')
      .filter((d) => d.event_id === eventId)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

    const assignments = devStore
      .getAll<DivisionAssignmentRow>('division_assignments')
      .filter((a) => a.event_id === eventId)

    const out = divisions.map((d) => ({
      id: d.id!,
      eventId: d.event_id,
      name: d.name,
      cap: d.cap,
      createdAt: asIso(d.created_at),
      assignedCount: assignments.filter((a) => a.division_id === d.id && (a.status ?? 'assigned') === 'assigned').length,
    }))

    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** POST /portal/api/events/[id]/divisions
 *  Body: { name: string, cap?: number | null }
 */
export async function POST(req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name ?? '').trim()
    const cap = body?.cap === null || body?.cap === undefined
      ? null
      : Number.isFinite(Number(body.cap))
        ? Number(body.cap)
        : null

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = (await prisma.event_divisions.create({
        data: {
          event_id: eventId,
          name,
          cap,
        },
      })) as unknown as DivisionRow

      const out = {
        id: created.id!,
        eventId: created.event_id,
        name: created.name,
        cap: created.cap,
        createdAt: asIso(created.created_at),
        assignedCount: 0, // update when DB model exists
      }
      return NextResponse.json(out, { status: 201 })
    }

    // Dev fallback (let devStore generate the id)
    const created = devStore.upsert<DivisionRow>('event_divisions', {
      event_id: eventId,
      name,
      cap,
      created_at: new Date(),
    })

    const out = {
      id: created.id!,
      eventId: created.event_id,
      name: created.name,
      cap: created.cap,
      createdAt: asIso(created.created_at),
      assignedCount: 0,
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/divisions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}