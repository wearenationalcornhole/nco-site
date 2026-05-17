import { createClient } from '@supabase/supabase-js'
import { devStore } from '@/app/lib/devStore'
import {
  canUseAdminTools,
  canUsePlayerFeatures,
  getProfileDisplayName,
  type ProfileVisibility,
  type SharedProfile,
} from '@/app/lib/profileCapabilities'
import { getSupabaseServiceRoleKey } from '@/app/lib/site'

export type ClubIdentityRow = {
  id: string
  name: string
}

export type LegacyUserIdentityRow = {
  id: string
  email: string | null
  name: string | null
}

export type ProfileIdentityRow = SharedProfile & {
  id: string
  email: string | null
  role: string | null
  created_at?: string | null
  updated_at?: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  city: string | null
  region: string | null
  primary_club_id: string | null
  display_name: string | null
  skill_level: string | null
  favorite_bag_style: string | null
  dominant_hand: string | null
  home_venue: string | null
  profile_visibility: string | null
}

export type ViewerAccess = {
  userId: string | null
  role: string | null
  isAuthenticated: boolean
}

export type DisplayIdentitySummary = {
  id: string
  email: string | null
  role: string | null
  name: string
}

export function getProfileServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function normalizeProfileVisibility(value: string | null | undefined): ProfileVisibility {
  if (value === 'public' || value === 'members' || value === 'private') return value
  return 'public'
}

export function canReadProfileIdentity(profile: Pick<ProfileIdentityRow, 'id' | 'profile_visibility'>, viewer: ViewerAccess) {
  const visibility = normalizeProfileVisibility(profile.profile_visibility)

  if (viewer.userId === profile.id) return true
  if (canUseAdminTools(viewer.role)) return true
  if (visibility === 'public') return true
  if (visibility === 'members') return viewer.isAuthenticated
  return false
}

export function canListProfileIdentity(profile: Pick<ProfileIdentityRow, 'id' | 'role' | 'profile_visibility'>, viewer: ViewerAccess) {
  if (!canUsePlayerFeatures(profile.role)) return false

  const visibility = normalizeProfileVisibility(profile.profile_visibility)
  if (viewer.userId === profile.id) return true
  if (canUseAdminTools(viewer.role)) return true
  if (visibility === 'private') return false
  if (visibility === 'members') return viewer.isAuthenticated
  return true
}

export function buildProfileIdentityPayload(
  profile: ProfileIdentityRow,
  clubName: string | null,
) {
  const name = getProfileDisplayName(profile)

  return {
    id: profile.id,
    profile_id: profile.id,
    player_id: profile.id,
    email: profile.email ?? null,
    role: profile.role ?? null,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    display_name: profile.display_name ?? null,
    name,
    avatar_url: profile.avatar_url ?? null,
    city: profile.city ?? null,
    region: profile.region ?? null,
    club: clubName,
    primary_club_id: profile.primary_club_id ?? null,
    skill_level: profile.skill_level ?? null,
    favorite_bag_style: profile.favorite_bag_style ?? null,
    dominant_hand: profile.dominant_hand ?? null,
    home_venue: profile.home_venue ?? null,
    profile_visibility: normalizeProfileVisibility(profile.profile_visibility),
    created_at: profile.created_at ?? null,
    createdAt: profile.created_at ?? null,
  }
}

export function buildDisplayIdentitySummaryFromProfile(
  profile: Pick<ProfileIdentityRow, 'id' | 'email' | 'role' | 'display_name' | 'first_name' | 'last_name'>,
): DisplayIdentitySummary {
  return {
    id: profile.id,
    email: profile.email ?? null,
    role: profile.role ?? null,
    name: getProfileDisplayName(profile),
  }
}

export function buildDisplayIdentitySummaryFromLegacyUser(
  user: Pick<LegacyUserIdentityRow, 'id' | 'email' | 'name'> & { role?: string | null },
): DisplayIdentitySummary {
  return {
    id: user.id,
    email: user.email ?? null,
    role: user.role ?? null,
    name: getProfileDisplayName({
      display_name: user.name ?? null,
      first_name: null,
      last_name: null,
      email: user.email ?? null,
    }),
  }
}

export async function listProfilesByIds(
  supa: ReturnType<typeof getProfileServiceClient>,
  userIds: string[],
) {
  if (!supa || userIds.length === 0) {
    return {
      profilesById: new Map<string, ProfileIdentityRow>(),
      clubsById: new Map<string, ClubIdentityRow>(),
    }
  }

  const { data: profiles, error: profilesError } = await supa
    .from('profiles')
    .select(
      'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
    )
    .in('id', userIds)

  if (profilesError) throw profilesError

  const clubIds = Array.from(
    new Set(((profiles ?? []) as ProfileIdentityRow[]).map((profile) => profile.primary_club_id).filter(Boolean)),
  ) as string[]

  const clubsById = new Map<string, ClubIdentityRow>()
  if (clubIds.length > 0) {
    const { data: clubs, error: clubsError } = await supa
      .from('clubs')
      .select('id,name')
      .in('id', clubIds)

    if (clubsError) throw clubsError
    for (const club of (clubs ?? []) as ClubIdentityRow[]) {
      clubsById.set(club.id, club)
    }
  }

  return {
    profilesById: new Map<string, ProfileIdentityRow>(((profiles ?? []) as ProfileIdentityRow[]).map((profile) => [profile.id, profile])),
    clubsById,
  }
}

export async function listLegacyUsersByIds(
  supa: ReturnType<typeof getProfileServiceClient>,
  userIds: string[],
) {
  if (!supa || userIds.length === 0) return new Map<string, LegacyUserIdentityRow>()

  // Legacy fallback only: used for historical rows that may not yet have matching
  // public.profiles records. New app identity reads should come from public.profiles.
  const { data: users, error } = await supa
    .from('users')
    .select('id,email,name')
    .in('id', userIds)

  if (error) {
    return new Map<string, LegacyUserIdentityRow>()
  }

  return new Map<string, LegacyUserIdentityRow>(((users ?? []) as LegacyUserIdentityRow[]).map((user) => [user.id, user]))
}

export async function listDisplayIdentitiesByIds(
  userIds: string[],
  legacyFallbackRows: Array<Pick<LegacyUserIdentityRow, 'id' | 'email' | 'name'> & { role?: string | null }> = [],
) {
  const orderedIds = Array.from(new Set(userIds.filter(Boolean)))
  const byId = new Map<string, DisplayIdentitySummary>()

  if (orderedIds.length === 0) return byId

  const supa = getProfileServiceClient()
  const legacyFallbackById = new Map(legacyFallbackRows.map((row) => [row.id, row]))

  if (supa) {
    const { profilesById } = await listProfilesByIds(supa, orderedIds)
    const missingIds = orderedIds.filter((userId) => !profilesById.has(userId))
    // Legacy fallback only: this keeps historical payment/admin rows readable while
    // public.profiles remains the canonical identity source.
    const serviceLegacyById = await listLegacyUsersByIds(supa, missingIds)

    for (const userId of orderedIds) {
      const profile = profilesById.get(userId)
      if (profile) {
        byId.set(userId, buildDisplayIdentitySummaryFromProfile(profile))
        continue
      }

      const fallback = legacyFallbackById.get(userId) ?? serviceLegacyById.get(userId)
      if (fallback) {
        byId.set(userId, buildDisplayIdentitySummaryFromLegacyUser(fallback))
      }
    }
  }

  for (const userId of orderedIds) {
    if (byId.has(userId)) continue

    const profile = devStore.getProfileById(userId)
    if (profile?.id) {
      byId.set(
        userId,
        buildDisplayIdentitySummaryFromProfile({
          id: profile.id,
          email: profile.email ?? null,
          role: profile.role ?? null,
          display_name: profile.display_name ?? null,
          first_name: profile.first_name ?? null,
          last_name: profile.last_name ?? null,
        }),
      )
      continue
    }

    // Local/dev compatibility fallback only. Explicit dev profiles mirror production
    // shape; legacy dev users are consulted only when a profile-shaped row is missing.
    const fallback = legacyFallbackById.get(userId) ?? devStore.getById<LegacyUserIdentityRow>('users', userId)
    if (fallback?.id) {
      byId.set(userId, buildDisplayIdentitySummaryFromLegacyUser(fallback))
      continue
    }

    byId.set(userId, {
      id: userId,
      email: null,
      role: null,
      name: 'NCO Player',
    })
  }

  return byId
}
