export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { createBagDesign, listBagDesignsForActor, sanitizeBagDesignForActor, sanitizeBagDesignsForActor } from '@/app/lib/bagMakerData'
import { requireRouteRoles } from '@/app/lib/portalRouteAccess'

export async function GET() {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const items = await listBagDesignsForActor(access.actor)
    return NextResponse.json({ items: sanitizeBagDesignsForActor(access.actor, items) })
  } catch (error: any) {
    console.error('GET /portal/api/bag-designs error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load bag designs.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const body = await request.json().catch(() => ({}))
    const design = await createBagDesign(access.actor, {
      eventId: typeof body?.eventId === 'string' && body.eventId ? body.eventId : null,
      clubId: typeof body?.clubId === 'string' && body.clubId ? body.clubId : null,
    })

    return NextResponse.json(sanitizeBagDesignForActor(access.actor, design), { status: 201 })
  } catch (error: any) {
    console.error('POST /portal/api/bag-designs error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to create bag design.' }, { status: 500 })
  }
}
