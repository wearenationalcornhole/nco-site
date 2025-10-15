export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { devStore } from '@/app/lib/devStore'

export async function GET() {
  try {
    // 1) Prisma
    const prisma = await getPrisma()
    if (prisma) {
      try {
        const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } })
        return NextResponse.json(events, { status: 200 })
      } catch (e) {
        console.error('Prisma query failed (events):', e)
      }
    }

    // 2) Supabase
    const sb = getSupabaseServer()
    if (sb) {
      const { data, error } = await sb
        .from('Event')
        .select('*')
        .order('createdAt', { ascending: false })
      if (!error && data) return NextResponse.json(data, { status: 200 })
      console.error('Supabase query failed (events):', error)
    }

    // 3) Fallback (local dev only)
    return NextResponse.json(devStore.getAll('events'), { status: 200 })
  } catch (e) {
    console.error('GET /portal/api/events failed:', e)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const { title, slug, city, date, image } = await req.json()
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

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

    const sb = getSupabaseServer()
    if (sb) {
      const { data, error } = await sb
        .from('Event')
        .insert([{ title, slug, city, date, image }])
        .select()
        .single()
      if (!error && data) return NextResponse.json(data, { status: 201 })
      console.error('Supabase insert failed (events):', error)
    }

    const created = devStore.upsert('events', { title, slug, city, date, image })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events fail:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}