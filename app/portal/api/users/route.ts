export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore, type DevProfileRecord } from '@/app/lib/devStore'
import { getRouteActor } from '@/app/lib/portalRouteAccess'
import {
  buildProfileIdentityPayload,
  canListProfileIdentity,
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

async function loadClubNames() {
  const supa = getProfileServiceClient()
  if (!supa) return new Map<string, string>()

  const { data: clubs, error } = await supa.from('clubs').select('id,name')
  if (error) throw error

  return new Map<string, string>(((clubs ?? []) as ClubIdentityRow[]).map((club) => [club.id, club.name]))
}

export async function GET(req: Request) {
  try {
    const actor = await getRouteActor()
    if (!actor.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const viewer = {
      userId: actor.user.id,
      role: actor.role,
      isAuthenticated: true,
    }

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

    const supa = getProfileServiceClient()
    if (supa) {
      const [profilesResult, clubNames] = await Promise.all([
        supa
          .from('profiles')
          .select(
            'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
          )
          .order('created_at', { ascending: false }),
        loadClubNames(),
      ])

      if (profilesResult.error) throw profilesResult.error

      const items = ((profilesResult.data ?? []) as ProfileIdentityRow[])
        .filter((profile) => canListProfileIdentity(profile, viewer))
        .map((profile) =>
          buildProfileIdentityPayload(
            profile,
            profile.primary_club_id ? clubNames.get(profile.primary_club_id) ?? null : null,
          ),
        )
        .filter((profile) => {
          if (!q) return true
          return [
            profile.name,
            profile.display_name ?? '',
            profile.email ?? '',
            profile.first_name ?? '',
            profile.last_name ?? '',
            profile.city ?? '',
            profile.region ?? '',
            profile.club ?? '',
            profile.role ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        })
        .slice(0, limit)

      return NextResponse.json({ source: 'profiles', items })
    }

    const items = devStore
      .listProfiles()
      .map((profile) => ({ profile, identity: toProfileIdentityRow(profile) }))
      .filter((entry): entry is { profile: DevProfileRecord; identity: ProfileIdentityRow } => Boolean(entry.identity))
      .filter((entry) => canListProfileIdentity(entry.identity, viewer))
      .map((entry) => buildProfileIdentityPayload(entry.identity, entry.profile.club ?? null))
      .filter((profile) => {
        if (!q) return true
        return [profile.name, profile.email ?? '', profile.city ?? '', profile.region ?? '', profile.role ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .slice(0, limit)

    return NextResponse.json({ source: 'devStore-profiles', items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getRouteActor()
    if (!actor.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const viewer = {
      userId: actor.user.id,
      role: actor.role,
      isAuthenticated: true,
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const supa = getProfileServiceClient()
    if (supa) {
      const { data: profile, error } = await supa
        .from('profiles')
        .select(
          'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
        )
        .eq('email', normalizedEmail)
        .maybeSingle<ProfileIdentityRow>()

      if (error) throw error
      if (!profile) {
        return NextResponse.json({ error: 'No portal profile exists for that email yet.' }, { status: 404 })
      }
      if (!canReadProfileIdentity(profile, viewer)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let clubName: string | null = null
      if (profile.primary_club_id) {
        const { data: club } = await supa
          .from('clubs')
          .select('id,name')
          .eq('id', profile.primary_club_id)
          .maybeSingle<ClubIdentityRow>()
        clubName = club?.name ?? null
      }

      // Compatibility wrapper only: this route no longer creates a separate user identity.
      return NextResponse.json(buildProfileIdentityPayload(profile, clubName))
    }

    const profile = devStore.getProfileByEmail(normalizedEmail)
    const identity = profile ? toProfileIdentityRow(profile) : null
    if (!identity) {
      return NextResponse.json({ error: 'No local profile exists for that email.' }, { status: 404 })
    }
    if (!canReadProfileIdentity(identity, viewer)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(buildProfileIdentityPayload(identity, profile?.club ?? null))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}
