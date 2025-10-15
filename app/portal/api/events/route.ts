export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { devStore } from '@/app/lib/devStore'

export async function GET() {
  try {
    // 1) Try Prisma
    const prisma = await getPrisma()
    if (prisma) {
      try {
        const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } })
        return NextResponse.json({ source: 'prisma', events }, { status: 200 })
      } catch (e) {
        console.error('Prisma query failed (events):', e)
      }
    }

    // 2) Try Supabase (server-side)
    const sb = getSupabaseServer()
    if (sb) {
      const { data, error } = await sb
        .from('Event')
        .select('*')
        .order('createdAt', { ascending: false })
      if (!error && data) {
        return NextResponse.json({ source: 'supabase', events: data }, { status: 200 })
      }
      console.error('Supabase query failed (events):', error)
    }

    // 3) Fallback to local dev memory store (empty on Vercel)
    return NextResponse.json(
      { source: 'devStore', events: devStore.getAll('events') },
      { status: 200 }
    )
  } catch (e: any) {
    console.error('GET /portal/api/events failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { title, slug, city, date, image } = await req.json()
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    // 1) Try Prisma
    const prisma = await getPrisma()
    if (prisma) {
      try {
        const data: any = { title }
        if (typeof slug !== 'undefined') data.slug = slug
        if (typeof city !== 'undefined') data.city = city
        if (typeof date !== 'undefined') data.date = date
        if (typeof image !== 'undefined') data.image = image
        const created = await prisma.event.create({ data })
        return NextResponse.json(created, { status: 201 })
      } catch (e) {
        console.error('Prisma create failed (events):', e)
      }
    }

    // 2) Try Supabase
    const sb = getSupabaseServer()
    if (sb) {
      const { data, error } = await sb
        .from('Event')
        .insert([{ title, slug, city, date, image }])
        .select()
        .single()
      if (!error && data) {
        return NextResponse.json(data, { status: 201 })
      }
      console.error('Supabase insert failed (events):', error)
    }

    // 3) Fallback to local dev memory store
    const created = devStore.upsert('events', { title, slug, city, date, image })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events fail:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}