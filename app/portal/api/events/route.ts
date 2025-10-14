import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET() {
  const prisma = getPrisma()
  if (prisma) {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(events)
  }
  return NextResponse.json(devStore.getAll('events'))
}

export async function POST(req: Request) {
  try {
    const { title, slug, city, date, image } = await req.json()
    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    const prisma = getPrisma()
    if (prisma) {
      // Build a flexible data object; only guaranteed field is title.
      const data: any = { title }

      // Add optional fields if your schema happens to include them in prod
      if (typeof slug !== 'undefined') data.slug = slug
      if (typeof city !== 'undefined') data.city = city
      if (typeof date !== 'undefined') data.date = date
      if (typeof image !== 'undefined') data.image = image

      const created = await prisma.event.create({ data })
      return NextResponse.json(created, { status: 201 })
    }

    // Fallback for local dev with devStore
    const created = devStore.upsert('events', { title, slug, city, date, image })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}