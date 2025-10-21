// app/portal/api/events/[id]/divisions/[divisionId]/assignments/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Status = 'assigned' | 'waitlisted'

// POST { userId } → assigns user to division, honoring cap; auto-waitlist if full
export async function POST(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()

    // fetch cap + current counts
    let cap: number | null = null
    let assignedCount = 0

    if (prisma) {
      const div = await prisma.event_divisions.findUnique({ where: { id: divisionId } }) as any
      if (!div || div.event_id !== eventId) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      cap = div.cap ?? null
      assignedCount = await prisma.division_assignments.count({
        where: { event_id: eventId, division_id: divisionId, status: 'assigned' },
      })
      // upsert assignment
      const status: Status = cap !== null && assignedCount >= cap ? 'waitlisted' : 'assigned'
      const created = await prisma.division_assignments.upsert({
        where: { event_id_division_id_user_id: { event_id: eventId, division_id: divisionId, user_id: userId } },
        create: { event_id: eventId, division_id: divisionId, user_id: userId, status },
        update: { status },
      })
      return NextResponse.json({ id: created.id, status: created.status })
    }

    // dev fallback
    const div = devStore.getById<any>('event_divisions', divisionId)
    if (!div || div.event_id !== eventId) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    cap = div.cap ?? null
    assignedCount = devStore.getAll<any>('division_assignments')
      .filter(a => a.event_id === eventId && a.division_id === divisionId && a.status === 'assigned').length

    const status: Status = cap !== null && assignedCount >= cap ? 'waitlisted' : 'assigned'
    const existing = devStore.getAll<any>('division_assignments')
      .find(a => a.event_id === eventId && a.division_id === divisionId && a.user_id === userId)

    const saved = devStore.upsert('division_assignments', existing ? { ...existing, status } : {
      event_id: eventId, division_id: divisionId, user_id: userId, status, created_at: new Date(),
    })
    return NextResponse.json({ id: saved.id, status: saved.status })
  } catch (e) {
    console.error('POST /events/[id]/divisions/[divisionId]/assignments error:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

// DELETE ?userId=... → removes assignment
export async function DELETE(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const url = new URL(req.url)
    const userId = String(url.searchParams.get('userId') ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      await prisma.division_assignments.deleteMany({
        where: { event_id: eventId, division_id: divisionId, user_id: userId },
      })
    } else {
      const current = devStore.getAll<any>('division_assignments')
      const hit = current.find(a => a.event_id === eventId && a.division_id === divisionId && a.user_id === userId)
      if (hit) devStore.remove('division_assignments', hit.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /events/[id]/divisions/[divisionId]/assignments error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}