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

type OutRow = {
  id: string
  name: string
  cap: number | null
  createdAt: string | null
  assignedCount: number
  waitlistedCount: number
}

function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function GET(_req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }
    const prisma = await getPrisma()

    let divisions: DivisionRow[] = []
    let assignments: { id: string; event_id: string; division_id: string; user_id: string; status: 'assigned' | 'waitlisted'; created_at: string | Date | null }[] = []

    if (prisma) {
      divisions = await prisma.event_divisions.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'asc' },
      }) as any

      assignments = await prisma.division_assignments.findMany({
        where: { event_id: eventId },
      }) as any
    } else {
      divisions = devStore.getAll('event_divisions').filter((d: any) => d.event_id === eventId)
      assignments = devStore.getAll('division_assignments').filter((a: any) => a.event_id === eventId)
    }

    const byDiv = new Map<string, { assigned: number; waitlisted: number }>()
    for (const a of assignments) {
      const b = byDiv.get(a.division_id) || { assigned: 0, waitlisted: 0 }
      if (a.status === 'assigned') b.assigned++
      else b.waitlisted++
      byDiv.set(a.division_id, b)
    }

    const out: OutRow[] = divisions.map((d) => {
      const counts = byDiv.get(d.id) || { assigned: 0, waitlisted: 0 }
      return {
        id: d.id,
        name: d.name,
        cap: d.cap ?? null,
        createdAt: asIso(d.created_at),
        assignedCount: counts.assigned,
        waitlistedCount: counts.waitlisted,
      }
    })

    return NextResponse.json(out)
  } catch (e) {
    console.error('GET /events/[id]/divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name ?? '').trim()
    const cap = body?.cap == null || body.cap === '' ? null : Number(body.cap)

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    if (cap !== null && (Number.isNaN(cap) || cap < 0)) {
      return NextResponse.json({ error: 'cap must be a positive number or null' }, { status: 400 })
    }

    const prisma = await getPrisma()
    let created: DivisionRow

    if (prisma) {
      created = await prisma.event_divisions.create({
        data: { event_id: eventId, name, cap },
      }) as any
    } else {
      created = devStore.upsert<DivisionRow>('event_divisions', {
        event_id: eventId,
        name,
        cap: cap ?? null,
        created_at: new Date(),
      })
    }

    const out: OutRow = {
      id: created.id,
      name: created.name,
      cap: created.cap ?? null,
      createdAt: asIso(created.created_at),
      assignedCount: 0,
      waitlistedCount: 0,
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e) {
    console.error('POST /events/[id]/divisions error:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}