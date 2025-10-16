export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      const EventSponsors = (prisma as any).event_sponsors
      if (!EventSponsors) throw new Error('Model event_sponsors not found')
      await EventSponsors.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }
    const ok = (devStore as any).remove('event_sponsors', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    console.error('DELETE /portal/api/event-sponsors/[id] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}