export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const prisma = await getPrisma()
    if (prisma) {
      await prisma.eventSponsor.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }
    devStore.remove('event_sponsors', id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /event-sponsors/[id] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}