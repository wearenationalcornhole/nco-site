// app/portal/api/events/[eventId]/bags/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type PatchPayload = {
  name?: string | null
  image_url?: string | null
  status?: 'Pending' | 'Approved' | 'Rejected'
  notes?: string | null
}

export async function PATCH(req: Request, ctx: any) {
  try {
    const { eventId, id } = ctx.params as { eventId: string; id: string }
    const body = (await req.json()) as PatchPayload

    const prisma = await getPrisma()
    if (prisma) {
      // ensure record belongs to the event
      const existing = await prisma.event_bag_submissions.findUnique({ where: { id } })
      if (!existing || existing.event_id !== eventId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const updated = await prisma.event_bag_submissions.update({
        where: { id },
        data: {
          name: typeof body.name !== 'undefined' ? body.name : undefined,
          image_url: typeof body.image_url !== 'undefined' ? body.image_url : undefined,
          status: typeof body.status !== 'undefined' ? body.status : undefined,
          notes: typeof body.notes !== 'undefined' ? body.notes : undefined,
        },
      })
      return NextResponse.json(updated)
    }

    // devStore fallback
    const row = devStore.getById<any>('event_bag_submissions', id)
    if (!row || row.event_id !== eventId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = devStore.replace('event_bag_submissions', id, {
      ...row,
      ...(typeof body.name !== 'undefined' ? { name: body.name } : {}),
      ...(typeof body.image_url !== 'undefined' ? { image_url: body.image_url } : {}),
      ...(typeof body.status !== 'undefined' ? { status: body.status } : {}),
      ...(typeof body.notes !== 'undefined' ? { notes: body.notes } : {}),
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PATCH /portal/api/events/[eventId]/bags/[id] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: any) {
  try {
    const { eventId, id } = ctx.params as { eventId: string; id: string }

    const prisma = await getPrisma()
    if (prisma) {
      // ensure record belongs to the event
      const existing = await prisma.event_bag_submissions.findUnique({ where: { id } })
      if (!existing || existing.event_id !== eventId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await prisma.event_bag_submissions.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    // devStore fallback (guard by event_id)
    const removed = devStore.remove('event_bag_submissions', id, (r) => r.event_id === eventId)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/events/[eventId]/bags/[id] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}