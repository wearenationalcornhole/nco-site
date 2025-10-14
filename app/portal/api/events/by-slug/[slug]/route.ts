export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const prisma = await getPrisma()

    if (prisma) {
      // Avoid referencing unknown fields in Prisma types; filter in JS
      const events = await prisma.event.findMany()
      const event =
        events.find((e: any) => e.slug === slug) ||
        events.find((e: any) => e.id === slug)

      if (!event) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(event)
    }

    // Fallback to local dev store
    const event =
      devStore.getAll<any>('events').find((e) => e.slug === slug) ||
      devStore.getAll<any>('events').find((e) => e.id === slug)

    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(event)
  } catch (e: any) {
    console.error('GET /portal/api/events/by-slug/[slug] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}