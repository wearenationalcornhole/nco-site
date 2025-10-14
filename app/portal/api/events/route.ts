import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET() {
  const prisma = getPrisma()
  if (prisma) {
    const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(events)
  }
  return NextResponse.json(devStore.getAll('events'))
}

export async function POST(req: Request) {
  try {
    const { title, slug, city, date, image } = await req.json()
    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug required' }, { status: 400 })
    }

    const prisma = getPrisma()
    if (prisma) {
      const created = await prisma.event.create({
        data: { title, slug, city, date, image },
      })
      return NextResponse.json(created, { status: 201 })
    }

    const created = devStore.upsert('events', { title, slug, city, date, image })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}