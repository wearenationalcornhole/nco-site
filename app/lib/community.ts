import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { deriveDisplayName } from '@/app/lib/communityProfile'

type ClubSeed = {
  name: string
  city?: string | null
  state?: string | null
  website?: string | null
  logo?: string | null
}

type ClubRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string | null
  logo_url: string | null
}

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  city: string | null
  region: string | null
  avatar_url: string | null
  primary_club_id: string | null
}

type ClubNameRow = { id: string; name: string }

export type PublicClub = {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string | null
  logoUrl: string | null
  source: 'supabase' | 'fallback'
}

export type DirectoryPlayer = {
  id: string
  displayName: string
  city: string | null
  region: string | null
  avatarUrl: string | null
  clubName: string | null
}

export async function getPublicClubs(): Promise<PublicClub[]> {
  try {
    const supabase = await getSupabaseServer()
    const { data, error } = await supabase
      .from('clubs')
      .select('id,name,city,state,website,logo_url')
      .order('name', { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((club: ClubRow) => ({
        id: club.id,
        name: club.name,
        city: club.city ?? null,
        state: club.state ?? null,
        website: club.website ?? null,
        logoUrl: club.logo_url ?? null,
        source: 'supabase',
      }))
    }
  } catch {
    // Fall back to seed data below.
  }

  const seed = (await import('@/app/data/clubs.json')).default as ClubSeed[]
  return seed.map((club, index) => ({
    id: `seed-club-${index + 1}`,
    name: club.name,
    city: club.city ?? null,
    state: club.state ?? null,
    website: club.website ?? null,
    logoUrl: club.logo ?? null,
    source: 'fallback',
  }))
}

export async function getGatedPlayerDirectory() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      requiresAuth: true,
      players: [] as DirectoryPlayer[],
      error: null as string | null,
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,first_name,last_name,city,region,avatar_url,primary_club_id')
    .order('first_name', { ascending: true })
    .limit(24)

  if (error) {
    return {
      requiresAuth: false,
      players: [] as DirectoryPlayer[],
      error: error.message,
    }
  }

  const rows = (data ?? []) as ProfileRow[]
  const clubIds = Array.from(
    new Set(rows.map((row) => row.primary_club_id).filter(Boolean)),
  ) as string[]
  const clubsById = new Map<string, string>()

  if (clubIds.length > 0) {
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id,name')
      .in('id', clubIds)

    ;(clubs ?? []).forEach((club: ClubNameRow) => clubsById.set(club.id, club.name))
  }

  return {
    requiresAuth: false,
    error: null as string | null,
    players: rows.map((row) => ({
      id: row.id,
      displayName: deriveDisplayName({
        firstName: row.first_name,
        lastName: row.last_name,
        fallback: 'NCO Member',
      }),
      city: row.city ?? null,
      region: row.region ?? null,
      avatarUrl: row.avatar_url ?? null,
      clubName: row.primary_club_id ? clubsById.get(row.primary_club_id) ?? null : null,
    })),
  }
}
