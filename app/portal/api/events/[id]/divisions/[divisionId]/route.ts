// app/portal/api/events/[id]/divisions/[divisionId]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function PATCH(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({}))
    const name = body?.name ? String(body.name).trim() : undefined
    const cap = body?.cap === null || body?.cap === '' || body?.cap === undefined
      ? undefined
      : Number(body.cap)

    const prisma = await getPrisma()
    let updated: any

    if (prisma) {
      updated = await prisma.event_divisions.update({
        where: { id: divisionId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(cap !== undefined ? { cap: Number.isNaN(cap) ? null : cap } : {}),
        },
      })
    } else {
      const row = devStore.getById<any>('event_divisions', divisionId)
      if (!row || row.event_id !== eventId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      updated = devStore.upsert('event_divisions', {
        ...row,
        ...(name !== undefined ? { name } : {}),
        ...(cap !== undefined ? { cap: Number.isNaN(cap) ? null : cap } : {}),
      })
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      cap: updated.cap ?? null,
      createdAt: updated.created_at ? new Date(updated.created_at).toISOString() : null,
    })
  } catch (e) {
    console.error('PATCH /events/[id]/divisions/[divisionId] error:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const prisma = await getPrisma()

    if (prisma) {
      // remove assignments first to avoid FK errors
      await prisma.division_assignments.deleteMany({ where: { event_id: eventId, division_id: divisionId } })
      await prisma.event_divisions.delete({ where: { id: divisionId } })
    } else {
      // dev: remove assignments & division
      devStore.getAll('division_assignments')
        .filter((a: any) => a.event_id === eventId && a.division_id === divisionId)
        .forEach((a: any) => devStore.remove('division_assignments', a.id))

      devStore.remove('event_divisions', divisionId)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /events/[id]/divisions/[divisionId] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}