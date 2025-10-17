export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const { slug } = context.params as { slug: string }
    const prisma = await getPrisma()
    if (prisma) {
      const event = await prisma.events.findFirst({ where: { slug } })
      if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(event)
    }
    const evt = devStore.getAll('events').find((e: any) => e.slug === slug)
    if (!evt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(evt)
  } catch (e) {
    console.error('GET /portal/api/events/by-slug/[slug] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}