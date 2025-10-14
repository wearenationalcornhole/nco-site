export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

function fallbackGet(slug: string) {
  try {
    const event =
      devStore.getAll<any>('events').find((e) => e.slug === slug) ||
      devStore.getAll<any>('events').find((e) => e.id === slug)
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(event, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function GET(_req: Request, context: any) {
  try {
    const { slug } = (context?.params ?? {}) as { slug: string }
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      try {
        const events = await prisma.event.findMany()
        const event =
          events.find((e: any) => e.slug === slug) ||
          events.find((e: any) => e.id === slug)
        if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(event, { status: 200 })
      } catch (e) {
        console.error('Prisma by-slug failed, falling back:', e)
        return fallbackGet(slug)
      }
    }
    return fallbackGet(slug)
  } catch (e) {
    console.error('GET /portal/api/events/by-slug/[slug] top-level fail:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}