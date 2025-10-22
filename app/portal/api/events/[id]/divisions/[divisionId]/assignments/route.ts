// app/portal/api/events/[id]/divisions/[divisionId]/assignments/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Status = 'assigned' | 'waitlisted'

// What we return to the client
type Row = {
  id: string
  eventId: string
  divisionId: string
  userId: string
  status: Status
  createdAt: string | null
  user?: { id: string; name?: string | null; email?: string | null } | null
}

// DB/devStore row (snake_case)
type RowDb = {
  id?: string
  event_id: string
  division_id: string
  user_id: string
  status: Status
  created_at: string | Date | null
}

// helpers
function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

async function getUserById(prisma: any | null, userId: string) {
  if (prisma) {
    const u = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }).catch(() => null)
    return u ?? null
  }
  // dev fallback
  const u = devStore.getById<any>('users', userId)
  return u ? { id: u.id, name: u.name ?? null, email: u.email ?? null } : null
}

async function listAssignments(prisma: any | null, eventId: string, divisionId: string): Promise<Row[]> {
  let rows: RowDb[] = []
  if (prisma) {
    rows = (await prisma.division_assignments.findMany({
      where: { event_id: eventId, division_id: divisionId },
      orderBy: { created_at: 'desc' },
    })) as unknown as RowDb[]
  } else {
    rows = devStore
      .getAll<RowDb>('division_assignments')
      .filter((a) => a.event_id === eventId && a.division_id === divisionId)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
  }

  // stitch user info
  const out: Row[] = []
  for (const r of rows) {
    const user = await getUserById(prisma, r.user_id)
    out.push({
      id: r.id!,
      eventId: r.event_id,
      divisionId: r.division_id,
      userId: r.user_id,
      status: r.status,
      createdAt: asIso(r.created_at),
      user,
    })
  }
  return out
}

// GET: list assignments for a division (with user info)
export async function GET(_req: Request, ctx: any) {
  try {
    const { id: eventId, divisionId } = ctx.params as { id: string; divisionId: string }
    const prisma = await getPrisma()
    const out = await listAssignments(prisma, eventId, divisionId)
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET assignments error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: create assignment
// - If body has { userId }, assign that user.
// - If not provided, auto-assign next registration (respects cap: assigned vs waitlisted)
export async function POST(req: Request, ctx: any) {
  try {
    const { id: eventId, divisionId } = ctx.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({} as any))
    let userId: string = (body?.userId ?? '').trim()

    const prisma = await getPrisma()

    // find division & cap
    let cap: number | null = null
    if (prisma) {
      const d = await prisma.event_divisions.findUnique({ where: { id: divisionId } }).catch(() => null)
      if (!d || d.event_id !== eventId) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      cap = d.cap ?? null
    } else {
      const d = devStore.getById<any>('event_divisions', divisionId)
      if (!d || d.event_id !== eventId) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      cap = d.cap ?? null
    }

    // compute assigned count
    let assignedCount = 0
    if (prisma) {
      assignedCount = await prisma.division_assignments.count({
        where: { event_id: eventId, division_id: divisionId, status: 'assigned' },
      })
    } else {
      assignedCount = devStore
        .getAll<RowDb>('division_assignments')
        .filter((a) => a.event_id === eventId && a.division_id === divisionId && a.status === 'assigned').length
    }
    const status: Status = cap !== null && assignedCount >= cap ? 'waitlisted' : 'assigned'

    // auto-pick next registration if userId not provided
    if (!userId) {
      let regRows: { user_id: string; created_at: string | Date | null }[] = []
      if (prisma) {
        regRows = (await prisma.registrations.findMany({
          where: { event_id: eventId },
          orderBy: { created_at: 'asc' },
          select: { user_id: true, created_at: true },
        })) as any
      } else {
        regRows = devStore
          .getAll<any>('registrations')
          .filter((r) => r.event_id === eventId)
          .sort((a, b) => (asIso(a.created_at) ?? '').localeCompare(asIso(b.created_at) ?? ''))
          .map((r) => ({ user_id: r.user_id, created_at: r.created_at }))
      }

      // exclude already assigned/waitlisted in this division
      const already = new Set<string>()
      if (prisma) {
        const asn = (await prisma.division_assignments.findMany({
          where: { event_id: eventId, division_id: divisionId },
          select: { user_id: true },
        })) as { user_id: string }[]
        asn.forEach((a) => already.add(a.user_id))
      } else {
        devStore
          .getAll<RowDb>('division_assignments')
          .filter((a) => a.event_id === eventId && a.division_id === divisionId)
          .forEach((a) => already.add(a.user_id))
      }

      const nextReg = regRows.find((r) => !already.has(r.user_id))
      if (!nextReg) return NextResponse.json({ error: 'No available registrations' }, { status: 400 })
      userId = nextReg.user_id
    }

    let created: RowDb
    if (prisma) {
      created = (await prisma.division_assignments.create({
        data: {
          event_id: eventId,
          division_id: divisionId,
          user_id: userId,
          status,
        },
      })) as unknown as RowDb
    } else {
      created = devStore.upsert<RowDb>('division_assignments', {
        event_id: eventId,
        division_id: divisionId,
        user_id: userId,
        status,
        created_at: new Date(),
      })
    }

    const user = await getUserById(prisma, userId)

    const out: Row = {
      id: created.id!,
      eventId: created.event_id,
      divisionId: created.division_id,
      userId: created.user_id,
      status: created.status,
      createdAt: asIso(created.created_at),
      user,
    }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST assignments error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

// DELETE: remove by ?assignmentId=...
export async function DELETE(req: Request, ctx: any) {
  try {
    const { id: eventId, divisionId } = ctx.params as { id: string; divisionId: string }
    const { searchParams } = new URL(req.url)
    const assignmentId = String(searchParams.get('assignmentId') ?? '').trim()
    if (!assignmentId) return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      // ensure it belongs to event/division
      const row = await prisma.division_assignments.findUnique({ where: { id: assignmentId } }).catch(() => null)
      if (!row || row.event_id !== eventId || row.division_id !== divisionId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await prisma.division_assignments.delete({ where: { id: assignmentId } })
    } else {
      const row = devStore.getById<RowDb>('division_assignments', assignmentId)
      if (!row || row.event_id !== eventId || row.division_id !== divisionId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      devStore.remove('division_assignments', assignmentId)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE assignments error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}