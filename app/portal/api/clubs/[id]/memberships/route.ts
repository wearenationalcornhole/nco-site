export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  getClubMembershipRole,
  getRouteActor,
  requireManagedClubAccess,
  type RouteActor,
} from '@/app/lib/portalRouteAccess'
import {
  canManageClubMembership,
  canUseAdminTools,
  getProfileDisplayName,
  type ClubMembershipRole,
} from '@/app/lib/profileCapabilities'

type MembershipRow = {
  id: string
  club_id: string
  profile_id: string
  role: ClubMembershipRole
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  role: string | null
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
}

const VALID_ROLES: ClubMembershipRole[] = ['owner', 'manager', 'staff', 'member']

function isValidRole(value: string | null | undefined): value is ClubMembershipRole {
  return VALID_ROLES.includes((value ?? '') as ClubMembershipRole)
}

async function loadActorMembershipRole(actor: RouteActor, clubId: string) {
  if (canUseAdminTools(actor.role)) return 'owner' as ClubMembershipRole
  return getClubMembershipRole(actor, clubId)
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const clubId = params.id

  const access = await requireManagedClubAccess(clubId)
  if ('error' in access) return access.error

  const { actor } = access
  const { data: membershipRows, error: membershipError } = await actor.supabase
    .from('club_memberships')
    .select('id,club_id,profile_id,role,created_at,updated_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: true })

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  const memberships = (membershipRows ?? []) as MembershipRow[]
  const profileIds = [...new Set(memberships.map((membership) => membership.profile_id).filter(Boolean))]

  const { data: profileRows, error: profileError } = profileIds.length
    ? await actor.supabase
        .from('profiles')
        .select('id,email,role,first_name,last_name,display_name,avatar_url')
        .in('id', profileIds)
    : { data: [], error: null }

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const profilesById = new Map<string, ProfileRow>()
  for (const profile of ((profileRows ?? []) as ProfileRow[])) {
    profilesById.set(profile.id, profile)
  }

  return NextResponse.json({
    items: memberships.map((membership) => {
      const profile = profilesById.get(membership.profile_id)
      return {
        ...membership,
        profile: profile
          ? {
              id: profile.id,
              email: profile.email ?? null,
              role: profile.role ?? null,
              first_name: profile.first_name ?? null,
              last_name: profile.last_name ?? null,
              display_name: profile.display_name ?? null,
              avatar_url: profile.avatar_url ?? null,
              name: getProfileDisplayName(profile),
            }
          : null,
      }
    }),
  })
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const clubId = params.id

  const access = await requireManagedClubAccess(clubId)
  if ('error' in access) return access.error

  const { actor } = access
  const body = await req.json().catch(() => null)
  const profileId = String(body?.profile_id ?? '').trim()
  const nextRole = String(body?.role ?? '').trim()

  if (!profileId || !isValidRole(nextRole)) {
    return NextResponse.json({ error: 'profile_id and valid role are required' }, { status: 400 })
  }

  if (profileId === actor.user.id && !canUseAdminTools(actor.role)) {
    return NextResponse.json({ error: 'You cannot change your own club membership role here.' }, { status: 403 })
  }

  if (nextRole === 'owner' && !canUseAdminTools(actor.role)) {
    return NextResponse.json({ error: 'Only admins can assign owner role through this route.' }, { status: 403 })
  }

  const actorMembershipRole = await loadActorMembershipRole(actor, clubId)

  const { data: existingMembership } = await actor.supabase
    .from('club_memberships')
    .select('role')
    .eq('club_id', clubId)
    .eq('profile_id', profileId)
    .maybeSingle<{ role: ClubMembershipRole }>()

  if (!canManageClubMembership(actor.role, actorMembershipRole, existingMembership?.role ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (actorMembershipRole === 'manager' && (nextRole === 'owner' || nextRole === 'manager')) {
    return NextResponse.json({ error: 'Managers can only assign staff or member roles.' }, { status: 403 })
  }

  const { data: targetProfile, error: profileError } = await actor.supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle<{ id: string }>()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: membership, error: upsertError } = await actor.supabase
    .from('club_memberships')
    .upsert(
      {
        club_id: clubId,
        profile_id: profileId,
        role: nextRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'club_id,profile_id' },
    )
    .select('id,club_id,profile_id,role,created_at,updated_at')
    .maybeSingle<MembershipRow>()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ item: membership }, { status: existingMembership ? 200 : 201 })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const clubId = params.id

  const access = await requireManagedClubAccess(clubId)
  if ('error' in access) return access.error

  const { actor } = access
  const body = await req.json().catch(() => null)
  const profileId = String(body?.profile_id ?? '').trim()

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  if (profileId === actor.user.id && !canUseAdminTools(actor.role)) {
    return NextResponse.json({ error: 'You cannot remove your own club membership here.' }, { status: 403 })
  }

  const actorMembershipRole = await loadActorMembershipRole(actor, clubId)
  const { data: existingMembership } = await actor.supabase
    .from('club_memberships')
    .select('role')
    .eq('club_id', clubId)
    .eq('profile_id', profileId)
    .maybeSingle<{ role: ClubMembershipRole }>()

  if (!existingMembership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  if (!canManageClubMembership(actor.role, actorMembershipRole, existingMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteError } = await actor.supabase
    .from('club_memberships')
    .delete()
    .eq('club_id', clubId)
    .eq('profile_id', profileId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
