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
  created_at?: string | Date | null
}

function asIso(d: string | Date | null | undefined) {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function GET(_req: Request, ctx: any) {
  try {
    const { id: eventId } = ctx.params as { id: string }
    const prisma = await getPrisma()

    if (prisma) {
      const rows = await prisma.event_divisions.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
      }) as unknown as DivisionRow[]
      return NextResponse.json(rows.map(r => ({ ...r, created_at: asIso(r.created_at) })))
    }

    // dev fallback
    const rows = devStore.getAll<DivisionRow>('event_divisions')
      .filter(r => r.event_id === eventId)
      .sort((a,b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error('GET divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    const { id: eventId } = ctx.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name ?? '').trim()
    const cap = body?.cap === null || body?.cap === undefined
      ? null
      : Number.isFinite(Number(body.cap)) ? Number(body.cap) : null

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.event_divisions.create({
        data: { event_id: eventId, name, cap },
      }) as unknown as DivisionRow
      return NextResponse.json({ ...created, created_at: asIso(created.created_at) }, { status: 201 })
    }

    // dev fallback
    const created = devStore.upsert<DivisionRow>('event_divisions', {
      event_id: eventId,
      name,
      cap,
      created_at: new Date(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST divisions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function PATCH(req: Request, ctx: any) {
  try {
    const { id: eventId } = ctx.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const divisionId = String(body?.id ?? '').trim()
    if (!divisionId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const next: Partial<DivisionRow> = {}
    if (typeof body?.name === 'string') next.name = body.name.trim()
    if (body?.cap === null || body?.cap === undefined) next.cap = null
    else if (!Number.isNaN(Number(body.cap))) next.cap = Number(body.cap)

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.event_divisions.update({
        where: { id: divisionId },
        data: { ...next },
      }) as unknown as DivisionRow
      return NextResponse.json({ ...updated, created_at: asIso(updated.created_at) })
    }

    // dev fallback
    const existing = devStore.getById<DivisionRow>('event_divisions', divisionId)
    if (!existing || existing.event_id !== eventId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const updated = devStore.upsert<DivisionRow>('event_divisions', { ...existing, ...next })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PATCH divisions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: Request, ctx: any) {
  try {
    const { id: eventId } = ctx.params as { id: string }
    const { searchParams } = new URL(req.url)
    const divisionId = String(searchParams.get('id') ?? '').trim()
    if (!divisionId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      // Optional: ensure it belongs to this event
      const div = await prisma.event_divisions.findUnique({ where: { id: divisionId } }) as any
      if (!div || div.event_id !== eventId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await prisma.event_divisions.delete({ where: { id: divisionId } })
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const ok = devStore.remove('event_divisions', divisionId)
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    console.error('DELETE divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}