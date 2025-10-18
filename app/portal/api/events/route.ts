// app/portal/api/events/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type EventRow = {
  id: string
  slug?: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  created_at?: string | null
  createdAt?: string | null
}

// GET /portal/api/events
export async function GET(_req: Request) {
  try {
    const prisma = await getPrisma()

    if (prisma) {
      // Supabase schema is snake_case (events table)
      const rows = await prisma.events.findMany({
        orderBy: { created_at: 'desc' as const },
        take: 100,
      })

      const events = rows.map((r: any) => ({
        id: String(r.id),
        slug: r.slug ?? null,
        title: r.title,
        city: r.city ?? null,
        date: r.date ? String(r.date).slice(0, 10) : null,
        image: r.image ?? null,
        createdAt: r.created_at ?? null,
      }))

      return NextResponse.json({ source: 'supabase', events })
    }

    // Fallback to devStore (non-persistent on Vercel)
    const rows = devStore.getAll<EventRow>('events')
    return NextResponse.json({ source: 'devStore', events: rows })
  } catch (e: any) {
    console.error('GET /portal/api/events error:', e?.message || e)
    // Graceful fallback (never 500 unless something catastrophic)
    try {
      const rows = devStore.getAll<EventRow>('events')
      return NextResponse.json({ source: 'devStore (prisma error)', events: rows })
    } catch {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }
}

// POST /portal/api/events  (simple admin/seed helper)
export async function POST(req: Request) {
  try {
    const { title, slug, city, date, image } = await req.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const created = await prisma.events.create({
        data: {
          title,
          slug: slug ?? null,
          city: city ?? null,
          date: date ? new Date(date) : null,
          image: image ?? null,
        },
      })
      return NextResponse.json(
        {
          id: String(created.id),
          slug: created.slug ?? null,
          title: created.title,
          city: created.city ?? null,
          date: created.date ? String(created.date).slice(0, 10) : null,
          image: created.image ?? null,
          createdAt: created.created_at ?? null,
        },
        { status: 201 }
      )
    }

    // dev fallback (handy locally)
    const created = devStore.upsert('events', {
      title,
      slug: slug ?? null,
      city: city ?? null,
      date: date ?? null,
      image: image ?? null,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}