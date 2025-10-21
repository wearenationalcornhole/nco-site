// app/portal/api/events/[id]/divisions/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type DivisionRow = {
  id: string
  event_id: string
  name: string
  cap: number | null
  created_at: string | Date | null
}

type AssignmentRow = {
  id: string
  event_id: string
  division_id: string
  user_id: string
  status: 'assigned' | 'waitlisted'
  created_at: string | Date | null
}

function asIso(d: string | Date | null) {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const eventId = ctx.params.id
  const prisma = await getPrisma()

  try {
    let divisions: DivisionRow[] = []
    let assignments: AssignmentRow[] = []

    if (prisma) {
      divisions = (await prisma.event_divisions.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
      })) as unknown as DivisionRow[]

      assignments = (await prisma.division_assignments.findMany({
        where: { event_id: eventId },
      })) as unknown as AssignmentRow[]
    } else {
      divisions = devStore
        .getAll<DivisionRow>('event_divisions')
        .filter((d) => d.event_id === eventId)
        .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

      assignments = devStore
        .getAll<AssignmentRow>('division_assignments')
        .filter((a) => a.event_id === eventId)
    }

    // attach counts
    const countsByDivision = new Map<string, number>()
    for (const a of assignments) {
      if (a.status !== 'assigned') continue
      countsByDivision.set(a.division_id, (countsByDivision.get(a.division_id) ?? 0) + 1)
    }

    const payload = divisions.map((d) => ({
      id: d.id,
      eventId: d.event_id,
      name: d.name,
      cap: d.cap,
      count: countsByDivision.get(d.id) ?? 0,
      createdAt: asIso(d.created_at),
    }))

    return NextResponse.json(payload)
  } catch (e) {
    console.error('GET divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const eventId = ctx.params.id
  const prisma = await getPrisma()
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name ?? '').trim()
    const cap = body?.cap === null || body?.cap === '' ? null : Number(body?.cap)

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    if (cap !== null && Number.isNaN(cap)) return NextResponse.json({ error: 'cap must be a number' }, { status: 400 })

    if (prisma) {
      const created = (await prisma.event_divisions.create({
        data: { event_id: eventId, name, cap },
      })) as unknown as DivisionRow

      return NextResponse.json({
        id: created.id,
        eventId: created.event_id,
        name: created.name,
        cap: created.cap,
        count: 0,
        createdAt: asIso(created.created_at),
      }, { status: 201 })
    }

  // dev fallback (no id provided; devStore will generate)
const created = devStore.upsert<any>('event_divisions', {
  event_id: eventId,
  name,
  cap: cap ?? null,
  created_at: new Date(),
})

    return NextResponse.json({
      id: created.id,
      eventId: created.event_id,
      name: created.name,
      cap: created.cap,
      count: 0,
      createdAt: asIso(created.created_at),
    }, { status: 201 })
  } catch (e: any) {
    console.error('POST divisions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Bad request' }, { status: 400 })
  }
}