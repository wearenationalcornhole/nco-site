export type SkillLevel = 'beginner' | 'intermediate' | 'competitive' | 'elite'
export type ProfileVisibility = 'members' | 'public' | 'private'

export type CommunityProfileMetadata = {
  display_name: string
  favorite_bag: string
  skill_level: SkillLevel
  profile_visibility: ProfileVisibility
}

export const SKILL_LEVEL_OPTIONS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'elite', label: 'Elite' },
]

export const PROFILE_VISIBILITY_OPTIONS: Array<{
  value: ProfileVisibility
  label: string
  description: string
}> = [
  {
    value: 'members',
    label: 'Members only',
    description: 'Visible to signed-in community members while the public directory is gated.',
  },
  {
    value: 'public',
    label: 'Public ready',
    description: 'Saved for the future public directory rollout after schema support is added.',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Keep your profile out of directory experiences for now.',
  },
]

export function readCommunityProfileMetadata(user: {
  user_metadata?: Record<string, unknown> | null
} | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>

  const skillLevel = meta.skill_level
  const visibility = meta.profile_visibility

  return {
    display_name: typeof meta.display_name === 'string' ? meta.display_name : '',
    favorite_bag: typeof meta.favorite_bag === 'string' ? meta.favorite_bag : '',
    skill_level:
      skillLevel === 'beginner' ||
      skillLevel === 'intermediate' ||
      skillLevel === 'competitive' ||
      skillLevel === 'elite'
        ? skillLevel
        : 'intermediate',
    profile_visibility:
      visibility === 'members' || visibility === 'public' || visibility === 'private'
        ? visibility
        : 'members',
  } satisfies CommunityProfileMetadata
}

export function deriveDisplayName({
  displayName,
  firstName,
  lastName,
  fallback,
}: {
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  fallback?: string | null
}) {
  const preferred = displayName?.trim()
  if (preferred) return preferred

  const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (combined) return combined

  return fallback?.trim() || 'NCO Member'
}

export function splitDisplayName(displayName: string) {
  const trimmed = displayName.trim().replace(/\s+/g, ' ')
  if (!trimmed) return { firstName: '', lastName: '' }

  const [firstName, ...rest] = trimmed.split(' ')
  return {
    firstName,
    lastName: rest.join(' '),
  }
}
