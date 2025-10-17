export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** GET /portal/api/events  → list events */
export async function GET() {
  try {
    const prisma = await getPrisma()
    if (prisma) {
      const rows = await prisma.events.findMany({
        orderBy: { created_at: 'desc' },
      })
      return NextResponse.json({ source: 'supabase', events: rows })
    }
    return NextResponse.json({ source: 'devStore', events: devStore.getAll('events') })
  } catch (e) {
    console.error('GET /portal/api/events error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** POST /portal/api/events  → create event */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, slug, city, date, image } = body ?? {}
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.events.create({
        data: {
          title,
          slug: slug ?? null,
          city: city ?? null,
          date: date ?? null,
          image_url: image ?? null,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }

    const created = devStore.upsert('events', {
      title, slug, city, date, image,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}