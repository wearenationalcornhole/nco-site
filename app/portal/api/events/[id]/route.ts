// app/portal/api/events/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Body = Partial<{
  title: string
  city: string | null
  date: string | null
  image: string | null
  logo_url: string | null
  slug: string | null
}>

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const ev = await prisma.events.findUnique({ where: { id } })
      if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(ev)
    }

    const ev = devStore.getById('events', id)
    if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(ev)
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body: Body = await req.json()

    const allowed: Body = {}
    for (const k of ['title', 'city', 'date', 'image', 'logo_url', 'slug'] as const) {
      if (k in body) (allowed as any)[k] = (body as any)[k]
    }

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.events.update({
        where: { id },
        data: {
          ...(allowed.title !== undefined ? { title: allowed.title } : {}),
          ...(allowed.city !== undefined ? { city: allowed.city } : {}),
          ...(allowed.date !== undefined ? { date: allowed.date ? new Date(allowed.date) : null } : {}),
          ...(allowed.image !== undefined ? { image: allowed.image } : {}),
          ...(allowed.logo_url !== undefined ? { /* if you added a column */ } : {}),
          ...(allowed.slug !== undefined ? { slug: allowed.slug } : {}),
        } as any,
      })
      return NextResponse.json(updated)
    }

    // DevStore fallback
    const existing = devStore.getById<any>('events', id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('events', { ...existing, ...allowed })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}