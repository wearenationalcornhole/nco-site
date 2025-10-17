export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** PATCH /portal/api/events/[id]/bags/[bagId] → update status or fields */
export async function PATCH(req: Request, context: { params: { id: string; bagId: string } }) {
  try {
    const { id, bagId } = context.params
    const body = await req.json()
    const { status, name, image_url, notes } = body ?? {}

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.event_bag_submissions.update({
        where: { id: bagId },
        data: { status, name, image_url, notes },
      })
      return NextResponse.json(updated)
    }

    const current = devStore.getAll('event_bag_submissions').find(
      (r) => r.id === bagId && r.event_id === id
    )
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('event_bag_submissions', { ...current, ...body, id: bagId })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PATCH /portal/api/events/[id]/bags/[bagId] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** DELETE /portal/api/events/[id]/bags/[bagId] */
export async function DELETE(_req: Request, context: { params: { id: string; bagId: string } }) {
  try {
    const { bagId } = context.params

    const prisma = await getPrisma()
    if (prisma) {
      await prisma.event_bag_submissions.delete({ where: { id: bagId } })
      return NextResponse.json({ ok: true })
    }

    const ok = devStore.remove('event_bag_submissions', bagId)
    return NextResponse.json({ ok })
  } catch (e) {
    console.error('DELETE /portal/api/events/[id]/bags/[bagId] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}