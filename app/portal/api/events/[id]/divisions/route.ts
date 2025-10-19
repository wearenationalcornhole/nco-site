// app/portal/api/events/[id]/divisions/route.ts
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

type DivisionOut = {
  id: string
  name: string
  cap: number | null
  createdAt: string | null
  membersCount: number
}

function asIso(d: string | Date | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function GET(_req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }
    const prisma = await getPrisma()

    if (prisma) {
      const divisions = (await prisma.event_divisions.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
      })) as unknown as DivisionRow[]

      // counts
      const members = (await prisma.event_division_members.findMany({
        where: { division: { event_id: eventId } },
      })) as unknown as { division_id: string }[]

      const countMap = new Map<string, number>()
      members.forEach((m) => countMap.set(m.division_id, (countMap.get(m.division_id) ?? 0) + 1))

      const out: DivisionOut[] = divisions.map((d) => ({
        id: d.id,
        name: d.name,
        cap: d.cap ?? null,
        createdAt: asIso(d.created_at),
        membersCount: countMap.get(d.id) ?? 0,
      }))
      return NextResponse.json(out)
    }

    // dev fallback
    const divisions = devStore.getAll<DivisionRow>('event_divisions').filter((d) => d.event_id === eventId)
    const members = devStore.getAll<{ division_id: string }>('event_division_members')

    const countMap = new Map<string, number>()
    members.forEach((m) => countMap.set(m.division_id, (countMap.get(m.division_id) ?? 0) + 1))

    const out: DivisionOut[] = divisions
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
      .map((d) => ({
        id: d.id!,
        name: d.name,
        cap: d.cap ?? null,
        createdAt: asIso(d.created_at),
        membersCount: countMap.get(d.id!) ?? 0,
      }))

    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/divisions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id: eventId } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name ?? '').trim()
    const cap = body?.cap != null ? Number(body.cap) : null
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    if (cap != null && Number.isNaN(cap)) return NextResponse.json({ error: 'cap must be a number' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = (await prisma.event_divisions.create({
        data: { event_id: eventId, name, cap: cap ?? undefined },
      })) as unknown as DivisionRow

      const out: DivisionOut = {
        id: created.id,
        name: created.name,
        cap: created.cap ?? null,
        createdAt: asIso(created.created_at),
        membersCount: 0,
      }
      return NextResponse.json(out, { status: 201 })
    }

    // dev fallback
    const created = devStore.upsert<DivisionRow>('event_divisions', {
      event_id: eventId,
      name,
      cap: cap ?? null,
      created_at: new Date(),
    })

    const out: DivisionOut = {
      id: created.id!,
      name: created.name,
      cap: created.cap ?? null,
      createdAt: asIso(created.created_at),
      membersCount: 0,
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/divisions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}