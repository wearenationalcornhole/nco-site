export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** GET /portal/api/events/[id]/bags → list bag submissions for event */
export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      const rows = await prisma.event_bag_submissions.findMany({
        where: { event_id: id },
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json({ source: 'supabase', rows })
    }
    const rows = devStore.getAll('event_bag_submissions').filter(r => r.event_id === id)
    return NextResponse.json({ source: 'devStore', rows })
  } catch (e) {
    console.error('GET /portal/api/events/[id]/bags error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** POST /portal/api/events/[id]/bags → create submission */
export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json()
    const { name, image_url, notes } = body ?? {}
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.event_bag_submissions.create({
        data: {
          event_id: id,
          name,
          image_url: image_url ?? null,
          status: 'Pending',
          notes: notes ?? null,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }

    const created = devStore.upsert('event_bag_submissions', {
      event_id: id,
      name,
      image_url: image_url ?? null,
      status: 'Pending',
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}