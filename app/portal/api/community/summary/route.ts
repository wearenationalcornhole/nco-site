export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { listCommunityActivity } from '@/app/lib/activityFeed'
import { getCornholeNearMe } from '@/app/lib/cornholeNearMe'
import { getRouteActor } from '@/app/lib/portalRouteAccess'

export async function GET() {
  try {
    const actor = await getRouteActor()
    if (!actor.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [communityPulse, nearMe] = await Promise.all([
      listCommunityActivity(
        {
          profileId: actor.user.id,
          role: actor.role,
          isAuthenticated: true,
        },
        5,
      ),
      getCornholeNearMe({ currentProfileId: actor.user.id }),
    ])

    return NextResponse.json({ communityPulse, nearMe })
  } catch (error: any) {
    console.error('GET /portal/api/community/summary error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load community summary.' }, { status: 500 })
  }
}
