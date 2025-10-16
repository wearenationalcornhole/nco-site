// app/portal/api/events/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// PATCH /portal/api/events/:id
// body: { tournament_logo_url?: string }
export async function PATCH(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { tournament_logo_url } = body as { tournament_logo_url?: string }

    if (typeof tournament_logo_url === 'undefined') {
      return NextResponse.json({ error: 'tournament_logo_url required' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      // snake_case to match your DB style
      const updated = await prisma.events.update({
        where: { id },
        data: { tournament_logo_url },
      })
      return NextResponse.json(updated)
    }

    // devStore fallback (merge into existing record)
    const current = devStore.getById('events', id)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('events', { ...current, tournament_logo_url })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}