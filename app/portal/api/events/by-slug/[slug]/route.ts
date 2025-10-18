// app/portal/api/events/by-slug/[slug]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const slug = context?.params?.slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // In your schema, the table is `events` with a `slug` column
      const event = await prisma.events.findFirst({ where: { slug } })
      if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(event)
    }

    // devStore fallback
    const items = devStore.getAll<any>('events')
    const match =
      items.find((e) => (e.slug || '').toLowerCase() === slug.toLowerCase()) ||
      items.find((e) => e.id === slug)

    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(match)
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}