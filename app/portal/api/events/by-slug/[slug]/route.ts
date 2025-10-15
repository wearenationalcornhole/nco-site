export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const { slug } = (context?.params ?? {}) as { slug: string }
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    // 1) Try Prisma
    const prisma = await getPrisma()
    if (prisma) {
      try {
        const events = await prisma.event.findMany()
        const event =
          events.find((e: any) => e.slug === slug) ||
          events.find((e: any) => e.id === slug)
        if (event) return NextResponse.json({ source: 'prisma', event }, { status: 200 })
      } catch (e) {
        console.error('Prisma by-slug failed:', e)
      }
    }

    // 2) Try Supabase (slug first; fallback to id)
    const sb = getSupabaseServer()
    if (sb) {
      const { data: bySlug, error: err1 } = await sb
        .from('Event')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (!err1 && bySlug) {
        return NextResponse.json({ source: 'supabase', event: bySlug }, { status: 200 })
      }
      const { data: byId, error: err2 } = await sb
        .from('Event')
        .select('*')
        .eq('id', slug)
        .maybeSingle()
      if (!err2 && byId) {
        return NextResponse.json({ source: 'supabase', event: byId }, { status: 200 })
      }
      console.error('Supabase by-slug failed:', err1 ?? err2)
    }

    // 3) Fallback to dev memory store
    const event =
      devStore.getAll<any>('events').find((e) => e.slug === slug) ||
      devStore.getAll<any>('events').find((e) => e.id === slug)
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ source: 'devStore', event }, { status: 200 })
  } catch (e) {
    console.error('GET /portal/api/events/by-slug/[slug] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}