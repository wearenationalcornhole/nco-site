// app/portal/api/events/[id]/divisions/[divisionId]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type DivisionRow = {
  id: string
  event_id: string
  name: string
  cap?: number | null
  created_at?: string | Date | null
}

function asIso(d: string | Date | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function PATCH(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({}))
    const name = body?.name != null ? String(body.name).trim() : undefined
    const capVal = body?.cap
    const cap = capVal === null ? null : capVal !== undefined ? Number(capVal) : undefined
    if (cap !== undefined && cap !== null && Number.isNaN(cap)) {
      return NextResponse.json({ error: 'cap must be a number' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const updated = (await prisma.event_divisions.update({
        where: { id: divisionId },
        data: { name, cap: cap as any },
      })) as unknown as DivisionRow

      const out = {
        id: updated.id,
        name: updated.name,
        cap: updated.cap ?? null,
        createdAt: asIso(updated.created_at),
      }
      return NextResponse.json(out)
    }

    // dev fallback
    const existing = devStore.getById<DivisionRow>('event_divisions', divisionId)
    if (!existing || existing.event_id !== eventId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const updated = devStore.upsert<DivisionRow>('event_divisions', {
      ...existing,
      name: name ?? existing.name,
      cap: cap === undefined ? existing.cap ?? null : cap,
    })
    const out = {
      id: updated.id!,
      name: updated.name,
      cap: updated.cap ?? null,
      createdAt: asIso(updated.created_at),
    }
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('PATCH /portal/api/events/[id]/divisions/[divisionId] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const prisma = await getPrisma()
    if (prisma) {
      // cascade will remove members via FK
      await prisma.event_divisions.delete({ where: { id: divisionId } })
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const existing = devStore.getById<DivisionRow>('event_divisions', divisionId)
    if (!existing || existing.event_id !== eventId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    devStore.remove('event_divisions', divisionId)
    // remove members for this division
    const members = devStore.getAll<any>('event_division_members').filter(m => m.division_id !== divisionId)
    ;(globalThis as any).__NCO_DEV_STORE__.event_division_members = members
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/events/[id]/divisions/[divisionId] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}