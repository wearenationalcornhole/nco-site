// app/portal/api/events/[id]/bags/[bagId]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Status = 'Pending' | 'Approved' | 'Rejected'

function okStatus(s: any): s is Status {
  return s === 'Pending' || s === 'Approved' || s === 'Rejected'
}

export async function GET(_req: Request, context: any) {
  try {
    const { bagId } = context.params as { id: string; bagId: string }
    const prisma = await getPrisma()
    if (prisma) {
      const row = await (prisma as any).event_bag_submissions.findUnique({ where: { id: bagId } })
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(row)
    }
    const row = devStore.getAll('event_bag_submissions').find((r) => r.id === bagId)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const { id, bagId } = context.params as { id: string; bagId: string }
    const body = await req.json().catch(() => ({}))
    const status: Status | undefined = body?.status
    if (!okStatus(status)) {
      return NextResponse.json({ error: 'status must be Pending | Approved | Rejected' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await (prisma as any).event_bag_submissions.update({
        where: { id: bagId },
        data: { status },
      })
      return NextResponse.json(updated)
    }

    // dev fallback
    const rows = devStore.getAll<any>('event_bag_submissions')
    const idx = rows.findIndex((r) => r.id === bagId && r.event_id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = { ...rows[idx], status }
    rows[idx] = updated
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const { id, bagId } = context.params as { id: string; bagId: string }

    const prisma = await getPrisma()
    if (prisma) {
      // ensure it belongs to the event (optional)
      const existing = await (prisma as any).event_bag_submissions.findUnique({ where: { id: bagId } })
      if (!existing || existing.event_id !== id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await (prisma as any).event_bag_submissions.delete({ where: { id: bagId } })
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const removed = devStore.remove('event_bag_submissions', bagId)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}