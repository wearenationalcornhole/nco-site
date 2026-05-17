export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getRouteActor, listManagedClubs } from '@/app/lib/portalRouteAccess'

export async function GET() {
  const actor = await getRouteActor()

  if (!actor.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await listManagedClubs(actor)
  return NextResponse.json({ items })
}
