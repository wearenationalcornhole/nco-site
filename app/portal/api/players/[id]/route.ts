export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'
import { canUseAdminTools } from '@/app/lib/profileCapabilities'
import { getRouteActor } from '@/app/lib/portalRouteAccess'
import {
  buildProfileIdentityPayload,
  canReadProfileIdentity,
  getProfileServiceClient,
  type ClubIdentityRow,
  type ProfileIdentityRow,
} from '@/app/lib/profileIdentity'

type DevUserRow = {
  id: string
  email?: string | null
  name?: string | null
  created_at?: string | null
  createdAt?: string | null
}

function toDevPlayer(row: DevUserRow) {
  const createdAt = row.created_at ?? row.createdAt ?? null
  return {
    id: String(row.id),
    profile_id: String(row.id),
    player_id: String(row.id),
    name: row.name ?? row.email?.split('@')[0] ?? 'NCO Player',
    display_name: row.name ?? null,
    email: row.email ?? null,
    created_at: createdAt,
    createdAt,
  }
}

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const actor = await getRouteActor()
    const viewer = {
      userId: actor.user?.id ?? null,
      role: actor.role,
      isAuthenticated: Boolean(actor.user),
    }

    const supa = getProfileServiceClient()
    if (supa) {
      const { data: profile, error } = await supa
        .from('profiles')
        .select(
          'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
        )
        .eq('id', id)
        .maybeSingle<ProfileIdentityRow>()

      if (error) throw error
      if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (!canReadProfileIdentity(profile, viewer)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let club: ClubIdentityRow | null = null
      if (profile.primary_club_id) {
        const { data: clubRow } = await supa
          .from('clubs')
          .select('id,name')
          .eq('id', profile.primary_club_id)
          .maybeSingle<ClubIdentityRow>()
        club = clubRow ?? null
      }

      const payload = buildProfileIdentityPayload(profile, club?.name ?? null)
      return NextResponse.json({
        ...payload,
        club: club
          ? {
              id: club.id,
              name: club.name,
            }
          : null,
      })
    }

    const row = devStore.getById<DevUserRow>('users', id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(toDevPlayer(row))
  } catch (e: any) {
    console.error('GET /portal/api/players/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const actor = await getRouteActor()
    if (!actor.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.user.id !== id && !canUseAdminTools(actor.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : undefined
    const city = typeof body.city === 'string' ? body.city.trim() : undefined
    const region = typeof body.region === 'string' ? body.region.trim() : undefined

    const supa = getProfileServiceClient()
    if (supa) {
      const patch: Record<string, string | null> = {}
      if (displayName !== undefined) patch.display_name = displayName || null
      if (city !== undefined) patch.city = city || null
      if (region !== undefined) patch.region = region || null

      const { data: updated, error } = await supa
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .select(
          'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
        )
        .single<ProfileIdentityRow>()

      if (error) throw error

      let clubName: string | null = null
      if (updated.primary_club_id) {
        const { data: club } = await supa
          .from('clubs')
          .select('id,name')
          .eq('id', updated.primary_club_id)
          .maybeSingle<ClubIdentityRow>()
        clubName = club?.name ?? null
      }

      return NextResponse.json(buildProfileIdentityPayload(updated, clubName))
    }

    const row = devStore.getById<any>('users', id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('users', { ...row, ...(displayName !== undefined ? { name: displayName || null } : {}) })
    return NextResponse.json(toDevPlayer(updated))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const actor = await getRouteActor()
    if (!actor.user || !canUseAdminTools(actor.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: actor.user ? 403 : 401 })
    }

    const supa = getProfileServiceClient()
    if (supa) {
      return NextResponse.json(
        { error: 'Deleting shared profiles is not supported from this compatibility route.' },
        { status: 405 },
      )
    }

    const ok = devStore.remove('users', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Delete failed' }, { status: 400 })
  }
}
