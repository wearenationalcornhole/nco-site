// app/portal/api/events/[id]/registrations/[regId]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(_req: Request, context: any) {
  try {
    const { id: eventId, regId } = context.params as { id: string; regId: string }

    // Try database first
    const prisma = await getPrisma()
    if (prisma) {
      // Be strict: only delete if it belongs to this event
      const result = await prisma.registrations.deleteMany({
        where: { id: regId, event_id: eventId },
      })
      if (result.count === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    }

    // Fallback to devStore (local memory)
    const all = devStore.getAll<any>('registrations')
    const exists = all.find((r) => r.id === regId && (r.event_id === eventId || r.eventId === eventId))
    if (!exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    devStore.remove('registrations', regId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /portal/api/events/[id]/registrations/[regId] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}