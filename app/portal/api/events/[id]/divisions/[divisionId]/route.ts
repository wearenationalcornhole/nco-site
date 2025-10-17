export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(_req: Request, context: any) {
  try {
    const { id, divisionId } = context.params as { id: string; divisionId: string }
    // ensure it belongs to the event
    const ok = devStore.remove(
      'divisions',
      divisionId
    )
    return NextResponse.json({ ok: !!ok })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}