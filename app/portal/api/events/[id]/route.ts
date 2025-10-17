export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** GET /portal/api/events/[id] */
export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      const row = await prisma.events.findUnique({ where: { id } })
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(row)
    }
    const found = devStore.getById('events', id)
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(found)
  } catch (e) {
    console.error('GET /portal/api/events/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** PATCH /portal/api/events/[id] */
export async function PATCH(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json()
    const { title, slug, city, date, image, tournament_logo_url } = body ?? {}

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.events.update({
        where: { id },
        data: {
          title,
          slug,
          city,
          date,
          image_url: image,
          tournament_logo_url, // if this column exists in your schema
        },
      })
      return NextResponse.json(updated)
    }

    const current = devStore.getById('events', id)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('events', { ...current, ...body, id })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PATCH /portal/api/events/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** DELETE /portal/api/events/[id] */
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()
    if (prisma) {
      await prisma.events.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }
    const ok = devStore.remove('events', id)
    return NextResponse.json({ ok })
  } catch (e) {
    console.error('DELETE /portal/api/events/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}