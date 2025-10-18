export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function GET() {
  try {
    const prisma = await getPrisma()
    if (prisma) {
      const events = await prisma.events.findMany({
        orderBy: { created_at: 'desc' as const },
      })
      return NextResponse.json({ source: 'supabase', events })
    }
    // dev fallback
    return NextResponse.json({ source: 'devStore', events: devStore.getAll('events') })
  } catch (e) {
    console.error('GET /portal/api/events error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawTitle: string | undefined = typeof body.title === 'string' ? body.title.trim() : undefined
    if (!rawTitle) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const rawSlug: string | undefined =
      typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : undefined
    const city: string | undefined = typeof body.city === 'string' && body.city.trim() ? body.city.trim() : undefined
    const date: string | undefined = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : undefined
    const image: string | undefined = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : undefined

    let baseSlug = rawSlug || slugify(rawTitle) || 'event'
    let finalSlug = baseSlug

    const prisma = await getPrisma()
    if (prisma) {
      // if slug exists → append short suffix
      const existing = await prisma.events.findFirst({ where: { slug: finalSlug } })
      if (existing) finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      const created = await prisma.events.create({
        data: {
          title: rawTitle,
          slug: finalSlug,
          city: city ?? null,
          // if your DB column is Date (no time), pass string "yyyy-mm-dd"
          date: date ? (new Date(date) as any) : null,
          image: image ?? null,
        },
        select: { id: true, slug: true, title: true, city: true, date: true, image: true, created_at: true },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // dev fallback
    const created = devStore.upsert('events', {
      id: crypto.randomUUID?.() ?? `evt_${Date.now()}`,
      title: rawTitle,
      slug: finalSlug,
      city: city ?? null,
      date: date ?? null,
      image: image ?? null,
      created_at: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}