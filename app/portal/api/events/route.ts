export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

function fallbackList() {
  try { return NextResponse.json(devStore.getAll('events'), { status: 200 }) }
  catch { return NextResponse.json([], { status: 200 }) }
}

export async function GET() {
  try {
    const prisma = await getPrisma()
    if (prisma) {
      try {
        const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } })
        return NextResponse.json(events, { status: 200 })
      } catch (e) {
        console.error('Prisma list failed, falling back:', e)
        return fallbackList()
      }
    }
    return fallbackList()
  } catch (e) {
    console.error('GET /portal/api/events top-level fail:', e)
    return fallbackList()
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
        console.error('Prisma create failed, falling back:', e)
      }
    }
    // dev fallback
    const created = devStore.upsert('events', { title, slug, city, date, image })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events fail:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}