// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      // DB path
      const rows = await prisma.registrations.findMany({
        where: { event_id: id },
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json(rows)
    }
    // Fallback: dev store
    const rows = devStore.getAll<any>('registrations').filter(r => r.event_id === id)
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const { userId } = await req.json() as { userId?: string }
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.registrations.create({
        data: { event_id: id, user_id: userId },
      })
      return NextResponse.json(created, { status: 201 })
    }
    // Fallback: dev store
    const created = devStore.upsert('registrations', {
      event_id: id,
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}