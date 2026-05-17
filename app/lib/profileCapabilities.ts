export type ProfileRole = 'player' | 'organizer' | 'admin'

export type ProfileSkillLevel = 'backyard' | 'social' | 'competitive' | 'advanced' | 'pro'

export type ProfileVisibility = 'public' | 'members' | 'private'

export type DominantHand = 'right' | 'left' | 'switch'

export type SharedProfile = {
  id?: string | null
  email?: string | null
  role?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  organization?: string | null
  avatar_url?: string | null
  primary_club_id?: string | null
  display_name?: string | null
  bio?: string | null
  skill_level?: string | null
  favorite_bag_style?: string | null
  dominant_hand?: string | null
  home_venue?: string | null
  profile_visibility?: string | null
  is_profile_complete?: boolean | null
}

const PLAYER_CAPABLE_ROLES = new Set<ProfileRole>(['player', 'organizer', 'admin'])
const ORGANIZER_CAPABLE_ROLES = new Set<ProfileRole>(['organizer', 'admin'])

export const PROFILE_SKILL_LEVEL_OPTIONS: ProfileSkillLevel[] = [
  'backyard',
  'social',
  'competitive',
  'advanced',
  'pro',
]

export const DOMINANT_HAND_OPTIONS: DominantHand[] = ['right', 'left', 'switch']

export const PROFILE_VISIBILITY_OPTIONS: ProfileVisibility[] = ['public', 'members', 'private']

export function canUsePlayerFeatures(role: string | null | undefined) {
  if (role == null) return true
  return PLAYER_CAPABLE_ROLES.has(role as ProfileRole)
}

export function canUseOrganizerTools(role: string | null | undefined) {
  if (role == null) return false
  return ORGANIZER_CAPABLE_ROLES.has(role as ProfileRole)
}

export function canUseAdminTools(role: string | null | undefined) {
  return role === 'admin'
}

export function getProfileDisplayName(profile: Pick<SharedProfile, 'display_name' | 'first_name' | 'last_name' | 'email'> | null | undefined) {
  const displayName = profile?.display_name?.trim()
  if (displayName) return displayName

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName

  const emailPrefix = profile?.email?.split('@')[0]?.trim()
  if (emailPrefix) return emailPrefix

  return 'NCO Player'
}

export function isProfileReadyForPortal(profile: Pick<SharedProfile, 'role' | 'first_name' | 'last_name' | 'city' | 'region' | 'organization'> | null | undefined) {
  return Boolean(
    profile?.role &&
      profile?.first_name &&
      profile?.last_name &&
      profile?.city &&
      profile?.region &&
      (profile.role !== 'organizer' || profile.organization),
  )
}

export function formatProfileValueLabel(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return 'Not set yet'

  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
