export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { emitProfileJoinedActivity } from '@/app/lib/activityFeed'
import { getRouteActor } from '@/app/lib/portalRouteAccess'

export async function POST() {
  try {
    const actor = await getRouteActor()
    if (!actor.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await emitProfileJoinedActivity(actor.user.id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('POST /portal/api/community/profile-joined error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to record profile activity.' }, { status: 500 })
  }
}
