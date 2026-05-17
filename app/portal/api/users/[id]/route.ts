export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore, type DevProfileRecord } from '@/app/lib/devStore'
import { canUseAdminTools } from '@/app/lib/profileCapabilities'
import { getRouteActor } from '@/app/lib/portalRouteAccess'
import {
  buildProfileIdentityPayload,
  canReadProfileIdentity,
  getProfileServiceClient,
  type ClubIdentityRow,
  type ProfileIdentityRow,
} from '@/app/lib/profileIdentity'

function toProfileIdentityRow(profile: DevProfileRecord): ProfileIdentityRow | null {
  if (!profile.id) return null

  return {
    id: profile.id,
    email: profile.email ?? null,
    role: profile.role ?? null,
    created_at: profile.created_at ?? null,
    updated_at: profile.updated_at ?? null,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    city: profile.city ?? null,
    region: profile.region ?? null,
    primary_club_id: profile.primary_club_id ?? null,
    display_name: profile.display_name ?? null,
    skill_level: profile.skill_level ?? null,
    favorite_bag_style: profile.favorite_bag_style ?? null,
    dominant_hand: profile.dominant_hand ?? null,
    home_venue: profile.home_venue ?? null,
    profile_visibility: profile.profile_visibility ?? 'public',
  }
}

async function loadClubName(supa: ReturnType<typeof getProfileServiceClient>, clubId: string | null | undefined) {
  if (!supa || !clubId) return null

  const { data: club } = await supa
    .from('clubs')
    .select('id,name')
    .eq('id', clubId)
    .maybeSingle<ClubIdentityRow>()

  return club ?? null
}

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const actor = await getRouteActor()
    if (!actor.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const viewer = {
      userId: actor.user.id,
      role: actor.role,
      isAuthenticated: true,
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

      const club = await loadClubName(supa, profile.primary_club_id)
      return NextResponse.json({
        ...buildProfileIdentityPayload(profile, club?.name ?? null),
        club: club ? { id: club.id, name: club.name } : null,
      })
    }

    const profile = devStore.getProfileById(id)
    const identity = profile ? toProfileIdentityRow(profile) : null
    if (!identity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canReadProfileIdentity(identity, viewer)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      ...buildProfileIdentityPayload(identity, profile?.club ?? null),
      club: profile?.primary_club_id
        ? { id: profile.primary_club_id, name: profile.club ?? 'Club' }
        : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const actor = await getRouteActor()
    if (!actor.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (actor.user.id !== id && !canUseAdminTools(actor.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    if (typeof body.email !== 'undefined') {
      return NextResponse.json(
        { error: 'Email updates are not supported from this compatibility route. Use account settings/auth flows instead.' },
        { status: 400 },
      )
    }

    const displayName =
      typeof body.display_name === 'string'
        ? body.display_name.trim()
        : typeof body.name === 'string'
        ? body.name.trim()
        : undefined
    const city = typeof body.city === 'string' ? body.city.trim() : undefined
    const region = typeof body.region === 'string' ? body.region.trim() : undefined
    const avatarUrl = typeof body.avatar_url === 'string' ? body.avatar_url.trim() : undefined

    const patch: Record<string, string | null> = {}
    if (displayName !== undefined) patch.display_name = displayName || null
    if (city !== undefined) patch.city = city || null
    if (region !== undefined) patch.region = region || null
    if (avatarUrl !== undefined) patch.avatar_url = avatarUrl || null

    const supa = getProfileServiceClient()
    if (supa) {
      const { data: updated, error } = await supa
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .select(
          'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
        )
        .single<ProfileIdentityRow>()

      if (error) throw error

      const club = await loadClubName(supa, updated.primary_club_id)
      return NextResponse.json({
        ...buildProfileIdentityPayload(updated, club?.name ?? null),
        club: club ? { id: club.id, name: club.name } : null,
      })
    }

    const current = devStore.getProfileById(id)
    if (!current?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = devStore.upsert('profiles', {
      ...current,
      ...(displayName !== undefined ? { display_name: displayName || null } : {}),
      ...(city !== undefined ? { city: city || null } : {}),
      ...(region !== undefined ? { region: region || null } : {}),
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {}),
    })

    const identity = toProfileIdentityRow(updated)
    if (!identity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      ...buildProfileIdentityPayload(identity, updated.club ?? null),
      club: updated.primary_club_id ? { id: updated.primary_club_id, name: updated.club ?? 'Club' } : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

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

    const ok = devStore.remove('profiles', id)
    if (devStore.getById('users', id)) {
      devStore.remove('users', id)
    }

    return NextResponse.json({ ok })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
