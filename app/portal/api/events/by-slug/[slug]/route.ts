import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params

  const prisma = getPrisma()
  if (prisma) {
    // Avoid referencing fields TS doesn't know about in EventWhereInput
    const events = await prisma.event.findMany()
    const event =
      events.find((e: any) => e.slug === slug) ||
      events.find((e: any) => e.id === slug) // fallback if you pass an id
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(event)
  }

  // Fallback to local dev store
  const event =
    devStore.getAll<any>('events').find((e) => e.slug === slug) ||
    devStore.getAll<any>('events').find((e) => e.id === slug)
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(event)
}