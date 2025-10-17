// app/portal/api/events/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type PartialEvent = {
  title?: string
  slug?: string | null
  city?: string | null
  date?: string | null
  image?: string | null
}

/** GET /portal/api/events/[id] — fetch single event */
export async function GET(_req: Request, context: any) {
  try {
    const { id } = await context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      const row = await prisma.event.findUnique({ where: { id } })
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(row)
    }
    const row = devStore.getById('events', id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(row)
  } catch (e) {
    console.error('GET /portal/api/events/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** PATCH /portal/api/events/[id] — update fields */
export async function PATCH(req: Request, context: any) {
  try {
    const { id } = await context.params as { id: string }
    const payload = (await req.json()) as PartialEvent

    // Only include defined fields so we don’t overwrite unintentionally
    const data: Record<string, any> = {}
    if (typeof payload.title !== 'undefined') data.title = payload.title
    if (typeof payload.slug  !== 'undefined') data.slug  = payload.slug
    if (typeof payload.city  !== 'undefined') data.city  = payload.city
    if (typeof payload.date  !== 'undefined') data.date  = payload.date
    if (typeof payload.image !== 'undefined') data.image = payload.image

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.event.update({
        where: { id },
        data,
      })
      return NextResponse.json(updated)
    }

    // dev fallback
    const current = devStore.getById('events', id)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('events', { ...current, ...data, id })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PATCH /portal/api/events/[id] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

/** DELETE /portal/api/events/[id] — remove event */
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = await context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      await prisma.event.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const ok = devStore.remove('events', id)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /portal/api/events/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}