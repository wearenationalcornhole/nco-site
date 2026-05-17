export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'
import { getRouteActor } from '@/app/lib/portalRouteAccess'
import {
  buildProfileIdentityPayload,
  canListProfileIdentity,
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)))
    const offset = (page - 1) * pageSize

    const actor = await getRouteActor()
    const viewer = {
      userId: actor.user?.id ?? null,
      role: actor.role,
      isAuthenticated: Boolean(actor.user),
    }

    const supa = getProfileServiceClient()
    if (supa) {
      const [{ data: profiles, error: profilesError }, { data: clubs, error: clubsError }] = await Promise.all([
        supa
          .from('profiles')
          .select(
            'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
          )
          .order('created_at', { ascending: false }),
        supa.from('clubs').select('id,name'),
      ])

      if (profilesError) throw profilesError
      if (clubsError) throw clubsError

      const clubNames = new Map<string, string>((clubs as ClubIdentityRow[] | null | undefined)?.map((club) => [club.id, club.name]) ?? [])

      const filtered = ((profiles ?? []) as ProfileIdentityRow[])
        .filter((profile) => canListProfileIdentity(profile, viewer))
        .map((profile) => buildProfileIdentityPayload(profile, profile.primary_club_id ? clubNames.get(profile.primary_club_id) ?? null : null))
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
            profile.skill_level ?? '',
            profile.favorite_bag_style ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        })

      const total = filtered.length
      const items = filtered.slice(offset, offset + pageSize)
      return NextResponse.json({ items, total, page, pageSize, source: 'profiles' })
    }

    const all = devStore.getAll<DevUserRow>('users')
    const filtered = all
      .filter((user) => {
        if (!q) return true
        return [user.name ?? '', user.email ?? ''].join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => (b.created_at ?? b.createdAt ?? '').localeCompare(a.created_at ?? a.createdAt ?? ''))

    const total = filtered.length
    const items = filtered.slice(offset, offset + pageSize).map(toDevPlayer)
    return NextResponse.json({ items, total, page, pageSize, source: 'devStore' })
  } catch (e: any) {
    console.error('GET /portal/api/players failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
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
        return NextResponse.json(
          { error: 'No portal profile exists for that email yet.' },
          { status: 404 },
        )
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

      return NextResponse.json(buildProfileIdentityPayload(profile, clubName))
    }

    const found = devStore
      .getAll<DevUserRow>('users')
      .find((user) => (user.email ?? '').toLowerCase() === normalizedEmail)

    if (!found) {
      return NextResponse.json({ error: 'No local player found for that email.' }, { status: 404 })
    }

    return NextResponse.json(toDevPlayer(found))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}
