// app/portal/api/events/[id]/divisions/[divisionId]/assignments/route.ts
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

export async function POST(req: Request, ctx: { params: { id: string; divisionId: string } }) {
  const eventId = ctx.params.id
  const divisionId = ctx.params.divisionId
  const prisma = await getPrisma()

  try {
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // find cap + current assigned count
    let cap: number | null = null
    let assignedCount = 0

    if (prisma) {
      const div = (await prisma.event_divisions.findUnique({ where: { id: divisionId } })) as unknown as DivisionRow | null
      if (!div || div.event_id !== eventId) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      cap = div.cap ?? null
      assignedCount = await prisma.division_assignments.count({
        where: { event_id: eventId, division_id: divisionId, status: 'assigned' },
      })
    } else {
      const div = devStore.getById<DivisionRow>('event_divisions', divisionId)
      if (!div || div.event_id !== eventId) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      cap = div.cap ?? null
      assignedCount = devStore
        .getAll<AssignmentRow>('division_assignments')
        .filter(a => a.event_id === eventId && a.division_id === divisionId && a.status === 'assigned').length
    }

    const status: 'assigned' | 'waitlisted' =
      cap !== null && assignedCount >= cap ? 'waitlisted' : 'assigned'

    if (prisma) {
      const created = (await prisma.division_assignments.create({
        data: { event_id: eventId, division_id: divisionId, user_id: userId, status },
      })) as unknown as AssignmentRow

      return NextResponse.json({
        id: created.id, eventId, divisionId, userId, status, createdAt: asIso(created.created_at),
      }, { status: 201 })
    }

    const created = devStore.upsert<AssignmentRow>('division_assignments', {
      event_id: eventId,
      division_id: divisionId,
      user_id: userId,
      status,
      created_at: new Date(),
    })

    return NextResponse.json({
      id: created.id, eventId, divisionId, userId, status, createdAt: asIso(created.created_at),
    }, { status: 201 })
  } catch (e: any) {
    console.error('POST assignments error:', e)
    return NextResponse.json({ error: e?.message ?? 'Bad request' }, { status: 400 })
  }
}