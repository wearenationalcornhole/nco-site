export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'
import { requireManagedEventAccess } from '@/app/lib/portalRouteAccess'
import {
  buildProfileIdentityPayload,
  getProfileServiceClient,
  listLegacyUsersByIds,
  listProfilesByIds,
  type LegacyUserIdentityRow,
  type ProfileIdentityRow,
} from '@/app/lib/profileIdentity'

type RegistrationRow = {
  id: string
  event_id: string
  user_id: string
  division_id?: string | null
  status?: string | null
  checked_in?: boolean | null
  notes?: string | null
  created_at?: string | null
}

function buildFallbackIdentity(userId: string, legacyUser: LegacyUserIdentityRow | null) {
  const name = legacyUser?.name?.trim() || legacyUser?.email?.split('@')[0] || 'NCO Player'
  return {
    id: userId,
    profile_id: userId,
    player_id: userId,
    email: legacyUser?.email ?? null,
    role: null,
    first_name: null,
    last_name: null,
    display_name: legacyUser?.name ?? null,
    name,
    avatar_url: null,
    city: null,
    region: null,
    club: null,
    primary_club_id: null,
    skill_level: null,
    favorite_bag_style: null,
    dominant_hand: null,
    home_venue: null,
    profile_visibility: 'members' as const,
    created_at: null,
    createdAt: null,
  }
}

function toRosterRow(
  registration: RegistrationRow,
  identity:
    | ReturnType<typeof buildProfileIdentityPayload>
    | ReturnType<typeof buildFallbackIdentity>,
) {
  return {
    id: registration.id,
    registration_id: registration.id,
    event_id: registration.event_id,
    eventId: registration.event_id,
    division_id: registration.division_id ?? null,
    divisionId: registration.division_id ?? null,
    user_id: registration.user_id,
    userId: registration.user_id,
    profile_id: identity.id,
    profileId: identity.id,
    player_id: identity.id,
    playerId: identity.id,
    status: registration.status ?? null,
    checked_in: registration.checked_in ?? null,
    notes: registration.notes ?? null,
    created_at: registration.created_at ?? null,
    createdAt: registration.created_at ?? null,
    name: identity.name,
    email: identity.email,
    avatar_url: identity.avatar_url,
    user: {
      id: identity.id,
      email: identity.email,
      name: identity.name,
      avatar_url: identity.avatar_url,
    },
    player: identity,
  }
}

export async function GET(_req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const access = await requireManagedEventAccess(id)
    if ('error' in access) return access.error

    const supa = getProfileServiceClient()
    if (supa) {
      const { data: registrations, error: registrationError } = await supa
        .from('registrations')
        .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
        .eq('event_id', id)
        .order('created_at', { ascending: false })

      if (registrationError) throw registrationError

      const userIds = Array.from(new Set((registrations ?? []).map((row) => row.user_id).filter(Boolean)))
      const { profilesById, clubsById } = await listProfilesByIds(supa, userIds)
      const missingUserIds = userIds.filter((userId) => !profilesById.has(userId))
      const legacyUsersById = await listLegacyUsersByIds(supa, missingUserIds)

      const items = ((registrations ?? []) as RegistrationRow[]).map((registration) => {
        const profile = profilesById.get(registration.user_id)
        const identity = profile
          ? buildProfileIdentityPayload(
              profile,
              profile.primary_club_id ? clubsById.get(profile.primary_club_id)?.name ?? null : null,
            )
          : buildFallbackIdentity(registration.user_id, legacyUsersById.get(registration.user_id) ?? null)

        return toRosterRow(registration, identity)
      })

      return NextResponse.json({ source: 'profiles', items })
    }

    const registrations = devStore.getAll<any>('registrations').filter((row) => row.event_id === id)
    const users = new Map(devStore.getAll<any>('users').map((row) => [row.id, row]))
    const items = registrations.map((registration) =>
      toRosterRow(
        registration,
        buildFallbackIdentity(registration.user_id, users.get(registration.user_id) ?? null),
      ),
    )
    return NextResponse.json({ source: 'devStore', items })
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/players error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const access = await requireManagedEventAccess(id)
    if ('error' in access) return access.error

    const payload = await req.json().catch(() => ({}))
    const email = String(payload?.email ?? '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const supa = getProfileServiceClient()
    if (supa) {
      const { data: profile, error: profileError } = await supa
        .from('profiles')
        .select(
          'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
        )
        .eq('email', email)
        .maybeSingle<ProfileIdentityRow>()

      if (profileError) throw profileError
      if (!profile) {
        return NextResponse.json(
          { error: 'No portal profile exists for that email yet.' },
          { status: 404 },
        )
      }

      const { data: existing } = await supa
        .from('registrations')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', profile.id)
        .maybeSingle<{ id: string }>()

      if (existing) {
        return NextResponse.json({ error: 'Player already registered for this event' }, { status: 409 })
      }

      const { data: created, error: createError } = await supa
        .from('registrations')
        .insert({
          event_id: id,
          user_id: profile.id,
          status: 'CONFIRMED',
          checked_in: false,
        })
        .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
        .single<RegistrationRow>()

      if (createError) throw createError

      let clubName: string | null = null
      if (profile.primary_club_id) {
        const { data: club } = await supa
          .from('clubs')
          .select('id,name')
          .eq('id', profile.primary_club_id)
          .maybeSingle()
        clubName = club?.name ?? null
      }

      return NextResponse.json(
        toRosterRow(created, buildProfileIdentityPayload(profile, clubName)),
        { status: 201 },
      )
    }

    let user = devStore.getAll<any>('users').find((entry) => (entry.email ?? '').toLowerCase() === email)
    if (!user) user = devStore.upsert('users', { email, name: payload?.name ?? null })

    const existing = devStore
      .getAll<any>('registrations')
      .find((row) => row.event_id === id && row.user_id === user.id)
    if (existing) {
      return NextResponse.json({ error: 'Player already registered for this event' }, { status: 409 })
    }

    const created = devStore.upsert<RegistrationRow>('registrations', {
      event_id: id,
      user_id: user.id,
      status: 'CONFIRMED',
      checked_in: false,
      created_at: new Date().toISOString(),
    } as RegistrationRow)

    return NextResponse.json(
      toRosterRow(created, buildFallbackIdentity(user.id, user)),
      { status: 201 },
    )
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/players error:', e?.message ?? e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}
