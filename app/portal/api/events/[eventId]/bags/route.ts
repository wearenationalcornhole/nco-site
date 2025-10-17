// app/portal/api/events/[eventId]/bags/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type CreatePayload = {
  name: string
  image_url?: string | null
  notes?: string | null
}

export async function GET(_req: Request, ctx: any) {
  try {
    const { eventId } = ctx.params as { eventId: string }
    const prisma = await getPrisma()
    if (prisma) {
      const rows = await prisma.event_bag_submissions.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json({ source: 'supabase', rows })
    }
    // devStore fallback
    const rows = devStore
      .getAll<any>('event_bag_submissions')
      .filter((r) => r.event_id === eventId)
      .sort((a, b) => (b.created_at ?? 0) > (a.created_at ?? 0) ? 1 : -1)
    return NextResponse.json({ source: 'devStore', rows })
  } catch (e: any) {
    console.error('GET /portal/api/events/[eventId]/bags failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    const { eventId } = ctx.params as { eventId: string }
    const body = (await req.json()) as CreatePayload
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.event_bag_submissions.create({
        data: {
          event_id: eventId,
          name,
          image_url: body.image_url ?? null,
          status: 'Pending',
          notes: body.notes ?? null,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // devStore fallback
    const created = devStore.upsert('event_bag_submissions', {
      event_id: eventId,
      name,
      image_url: body.image_url ?? null,
      status: 'Pending',
      notes: body.notes ?? null,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[eventId]/bags failed:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}