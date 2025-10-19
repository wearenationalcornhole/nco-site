// app/portal/api/events/[id]/divisions/[divisionId]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(_req: Request, context: any) {
  try {
    const { id, divisionId } = context.params as { id: string; divisionId: string }
    const prisma = await getPrisma()

    if (prisma) {
      // Ensure it belongs to this event
      const row = await prisma.event_divisions.findUnique({ where: { id: divisionId } })
      if (!row || row.event_id !== id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await prisma.event_divisions.delete({ where: { id: divisionId } })
      return NextResponse.json({ ok: true })
    }

    const row = devStore.getById<any>('event_divisions', divisionId)
    if (!row || row.event_id !== id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    devStore.remove('event_divisions', divisionId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /portal/api/events/[id]/divisions/[divisionId] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}