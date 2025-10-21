// app/portal/api/events/[id]/divisions/[divisionId]/members/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type RowDb = {
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

export async function GET(_req: Request, ctx: { params: { id: string; divisionId: string } }) {
  const eventId = ctx.params.id
  const divisionId = ctx.params.divisionId
  const prisma = await getPrisma()

  try {
    if (prisma) {
      const rows = (await prisma.division_assignments.findMany({
        where: { event_id: eventId, division_id: divisionId },
        orderBy: { created_at: 'desc' },
      })) as unknown as RowDb[]

      return NextResponse.json(rows.map(r => ({
        id: r.id,
        eventId: r.event_id,
        divisionId: r.division_id,
        userId: r.user_id,
        status: r.status,
        createdAt: asIso(r.created_at),
      })))
    }

    // dev fallback
    const rows = devStore
      .getAll<RowDb>('division_assignments')
      .filter((r) => r.event_id === eventId && r.division_id === divisionId)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

    return NextResponse.json(rows.map(r => ({
      id: r.id,
      eventId: r.event_id,
      divisionId: r.division_id,
      userId: r.user_id,
      status: r.status,
      createdAt: asIso(r.created_at),
    })))
  } catch (e) {
    console.error('GET division members error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}