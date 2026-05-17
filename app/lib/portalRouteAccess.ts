import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import {
  canManageClub,
  canUseAdminTools,
  canUseOrganizerTools,
  type ClubMembershipRole,
} from '@/app/lib/profileCapabilities'

type AllowedRole = 'admin' | 'organizer' | 'player'

export type RouteActor = {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>
  user: { id: string; email?: string | null }
  role: string | null
}

type ClubRow = {
  id: string
  name: string
  city: string | null
  state: string | null
}

type ClubMembershipRow = {
  club_id: string
  profile_id: string
  role: ClubMembershipRole
  clubs?: ClubRow | ClubRow[] | null
}

export type ManagedClubSummary = {
  clubId: string
  role: ClubMembershipRole | 'admin'
  club: ClubRow
}

export async function getRouteActor() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, role: null as string | null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>()

  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    role: profile?.role ?? null,
  }
}

export async function requireRouteRoles(roles: AllowedRole[]) {
  const actor = await getRouteActor()

  if (!actor.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!roles.includes((actor.role ?? '') as AllowedRole)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { actor }
}

export async function listManagedEventIds(actor: RouteActor) {
  if (canUseAdminTools(actor.role)) return null
  if (!canUseOrganizerTools(actor.role)) return []

  const { data, error } = await actor.supabase
    .from('event_admins')
    .select('event_id')
    .eq('user_id', actor.user.id)

  if (error) return []
  const rows = (data ?? []) as Array<{ event_id: string }>
  return rows.map((row) => row.event_id).filter(Boolean)
}

export async function canManageEvent(actor: RouteActor, eventId: string) {
  if (canUseAdminTools(actor.role)) return true
  // Event organizer capability stays separate from club-scoped management.
  if (!canUseOrganizerTools(actor.role)) return false

  const { data, error } = await actor.supabase
    .from('event_admins')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', actor.user.id)
    .maybeSingle()

  return !error && Boolean(data)
}

export async function requireManagedEventAccess(eventId: string) {
  const actor = await getRouteActor()

  if (!actor.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const allowed = await canManageEvent(actor, eventId)
  if (!allowed) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { actor }
}

function normalizeClubRow(value: ClubRow | ClubRow[] | null | undefined) {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getClubMembershipRole(actor: RouteActor, clubId: string) {
  const { data, error } = await actor.supabase
    .from('club_memberships')
    .select('role')
    .eq('club_id', clubId)
    .eq('profile_id', actor.user.id)
    .maybeSingle<{ role: ClubMembershipRole }>()

  if (error) return null
  return data?.role ?? null
}

export async function canManageClubAccess(actor: RouteActor, clubId: string) {
  if (canUseAdminTools(actor.role)) return true

  const membershipRole = await getClubMembershipRole(actor, clubId)
  return canManageClub(actor.role, membershipRole)
}

export async function requireManagedClubAccess(clubId: string) {
  const actor = await getRouteActor()

  if (!actor.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const allowed = await canManageClubAccess(actor, clubId)
  if (!allowed) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { actor }
}

export async function listManagedClubs(actor: RouteActor): Promise<ManagedClubSummary[]> {
  if (!actor.user) return []

  if (canUseAdminTools(actor.role)) {
    const { data, error } = await actor.supabase.from('clubs').select('id,name,city,state').order('name', { ascending: true })
    if (error) return []

    return ((data ?? []) as ClubRow[]).map((club) => ({
      clubId: club.id,
      role: 'admin',
      club,
    }))
  }

  const { data, error } = await actor.supabase
    .from('club_memberships')
    .select('club_id,profile_id,role,clubs(id,name,city,state)')
    .eq('profile_id', actor.user.id)
    .in('role', ['owner', 'manager'])

  if (error) return []

  return ((data ?? []) as ClubMembershipRow[])
    .map((membership) => {
      const club = normalizeClubRow(membership.clubs)
      if (!club) return null

      return {
        clubId: membership.club_id,
        role: membership.role,
        club,
      }
    })
    .filter(Boolean) as ManagedClubSummary[]
}

export function splitDisplayName(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return { firstName: null, lastName: null }
  }

  const parts = trimmed.split(/\s+/)
  const firstName = parts.shift() ?? null
  const lastName = parts.join(' ').trim() || null
  return { firstName, lastName }
}
