// app/portal/api/events/[id]/divisions/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Row = {
  id: string
  event_id: string
  name: string
  capacity?: number | null
  fee_cents?: number | null
  min_age?: number | null
  max_age?: number | null
  created_at?: string | null
}

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()

    if (prisma) {
      const rows = await prisma.event_divisions.findMany({
        where: { event_id: id },
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json(rows as Row[])
    }

    // devStore fallback
    const rows = devStore.getAll<Row>('event_divisions').filter(r => r.event_id === id)
    return NextResponse.json(rows)
  } catch (e) {
    console.error('GET /portal/api/events/[id]/divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json()
    const { divisionId, name, capacity, fee_cents, min_age, max_age } = body ?? {}

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // upsert: if divisionId provided, update; else create
      let out: any
      if (divisionId) {
        out = await prisma.event_divisions.update({
          where: { id: divisionId },
          data: {
            name,
            capacity: typeof capacity === 'number' ? capacity : null,
            fee_cents: typeof fee_cents === 'number' ? fee_cents : null,
            min_age: typeof min_age === 'number' ? min_age : null,
            max_age: typeof max_age === 'number' ? max_age : null,
          },
        })
      } else {
        out = await prisma.event_divisions.create({
          data: {
            event_id: id,
            name,
            capacity: typeof capacity === 'number' ? capacity : null,
            fee_cents: typeof fee_cents === 'number' ? fee_cents : null,
            min_age: typeof min_age === 'number' ? min_age : null,
            max_age: typeof max_age === 'number' ? max_age : null,
          },
        })
      }
      return NextResponse.json(out as Row, { status: divisionId ? 200 : 201 })
    }

    // devStore fallback
    if (divisionId) {
      const existing = devStore.getById<Row>('event_divisions', divisionId)
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const updated = devStore.upsert<Row>('event_divisions', {
        ...existing,
        name,
        capacity: typeof capacity === 'number' ? capacity : null,
        fee_cents: typeof fee_cents === 'number' ? fee_cents : null,
        min_age: typeof min_age === 'number' ? min_age : null,
        max_age: typeof max_age === 'number' ? max_age : null,
      })
      return NextResponse.json(updated, { status: 200 })
    } else {
      const created = devStore.upsert<Row>('event_divisions', {
        event_id: id,
        name,
        capacity: typeof capacity === 'number' ? capacity : null,
        fee_cents: typeof fee_cents === 'number' ? fee_cents : null,
        min_age: typeof min_age === 'number' ? min_age : null,
        max_age: typeof max_age === 'number' ? max_age : null,
        created_at: new Date().toISOString(),
      } as Row)
      return NextResponse.json(created, { status: 201 })
    }
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/divisions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}