import clubsSeed from '@/app/data/clubs.json'
import { getSupabaseServer } from '@/app/lib/supabaseServer'

export type ClubDirectoryItem = {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string | null
  logoUrl: string | null
  memberCount: number
}

export type PlayerDirectoryItem = {
  id: string
  name: string
  displayName: string | null
  city: string | null
  region: string | null
  avatarUrl: string | null
  clubName: string | null
  favoriteBag: string | null
  skillLevel: string | null
  profileVisibility: 'public' | 'members' | 'private'
  isOwnProfile: boolean
}

type ClubsRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string | null
  logo_url: string | null
}

type ProfileRow = {
  id: string
  role: string | null
  is_profile_complete: boolean | null
  first_name: string | null
  last_name: string | null
  city: string | null
  region: string | null
  avatar_url: string | null
  primary_club_id: string | null
}

type AuthMetadata = {
  display_name?: string | null
  favorite_bag?: string | null
  skill_level?: string | null
  profile_visibility?: 'public' | 'members' | 'private' | null
}

async function getSupabaseAdminSafe() {
  try {
    const mod = await import('@/app/lib/supabaseAdmin')
    return mod.supabaseAdmin
  } catch {
    return null
  }
}

function normalizeSeedClubs(): ClubDirectoryItem[] {
  return clubsSeed.map((club, index) => ({
    id: `seed-club-${index + 1}`,
    name: club.name,
    city: club.city ?? null,
    state: club.state ?? null,
    website: club.website ?? null,
    logoUrl: club.logo ?? null,
    memberCount: 0,
  }))
}

async function listAuthMetadataByUserId() {
  const admin = await getSupabaseAdminSafe()
  if (!admin) return new Map<string, AuthMetadata>()

  try {
    const metadata = new Map<string, AuthMetadata>()
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error

    for (const user of data?.users ?? []) {
      metadata.set(user.id, (user.user_metadata ?? {}) as AuthMetadata)
    }

    return metadata
  } catch {
    return new Map<string, AuthMetadata>()
  }
}

export async function listCommunityClubs(): Promise<ClubDirectoryItem[]> {
  const admin = await getSupabaseAdminSafe()
  if (!admin) {
    return normalizeSeedClubs()
  }

  try {
    const [{ data: clubs }, { data: profiles }] = await Promise.all([
      admin.from('clubs').select('id,name,city,state,website,logo_url').order('name', { ascending: true }),
      admin.from('profiles').select('id,primary_club_id'),
    ])

    if (!clubs?.length) {
      return normalizeSeedClubs()
    }

    const counts = new Map<string, number>()
    for (const profile of profiles ?? []) {
      const clubId = profile.primary_club_id
      if (!clubId) continue
      counts.set(clubId, (counts.get(clubId) ?? 0) + 1)
    }

    return (clubs as ClubsRow[]).map((club) => ({
      id: club.id,
      name: club.name,
      city: club.city ?? null,
      state: club.state ?? null,
      website: club.website ?? null,
      logoUrl: club.logo_url ?? null,
      memberCount: counts.get(club.id) ?? 0,
    }))
  } catch {
    return normalizeSeedClubs()
  }
}

export async function listCommunityPlayers(viewerId: string | null): Promise<PlayerDirectoryItem[]> {
  if (!viewerId) return []

  const admin = await getSupabaseAdminSafe()
  if (!admin) return []

  try {
    const metadataByUserId = await listAuthMetadataByUserId()
    const [{ data: profiles }, { data: clubs }] = await Promise.all([
      admin
        .from('profiles')
        .select('id,role,is_profile_complete,first_name,last_name,city,region,avatar_url,primary_club_id')
        .order('first_name', { ascending: true }),
      admin.from('clubs').select('id,name'),
    ])

    const clubNames = new Map<string, string>()
    for (const club of clubs ?? []) {
      clubNames.set(club.id, club.name)
    }

    return ((profiles ?? []) as ProfileRow[])
      .filter((profile) => profile.role === 'player' && profile.is_profile_complete)
      .map((profile) => {
        const metadata = metadataByUserId.get(profile.id) ?? {}
        const profileVisibility = metadata.profile_visibility ?? 'members'
        const firstLast = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
        const displayName = metadata.display_name?.trim() || null
        return {
          id: profile.id,
          name: firstLast || displayName || 'Community Member',
          displayName,
          city: profile.city ?? null,
          region: profile.region ?? null,
          avatarUrl: profile.avatar_url ?? null,
          clubName: profile.primary_club_id ? clubNames.get(profile.primary_club_id) ?? null : null,
          favoriteBag: metadata.favorite_bag?.trim() || null,
          skillLevel: metadata.skill_level?.trim() || null,
          profileVisibility,
          isOwnProfile: profile.id === viewerId,
        }
      })
      .filter((profile) => profile.profileVisibility !== 'private' || profile.isOwnProfile)
  } catch {
    return []
  }
}

export async function getCurrentViewer() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user ?? null
}

export async function getCurrentViewerClubId() {
  const viewer = await getCurrentViewer()
  if (!viewer) return null

  const supabase = await getSupabaseServer()
  const { data } = await supabase
    .from('profiles')
    .select('primary_club_id')
    .eq('id', viewer.id)
    .maybeSingle<{ primary_club_id: string | null }>()

  return data?.primary_club_id ?? null
}
