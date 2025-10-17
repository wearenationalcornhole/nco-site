export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const rows = devStore.getAll<any>('divisions').filter((d) => d.eventId === id)
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))
    const name = (body?.name ?? '').trim()
    const notes = body?.notes ?? undefined
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const created = devStore.upsert('divisions', {
      id: crypto.randomUUID(),
      eventId: id,
      name,
      notes,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}