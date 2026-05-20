import { devStore } from '@/app/lib/devStore'
import { formatEventLocation, normalizeDateOnly } from '@/app/lib/eventRecords'
import { listProfileActivity } from '@/app/lib/activityFeed'
import { canUseAdminTools, getProfileDisplayName } from '@/app/lib/profileCapabilities'
import {
  canReadProfileIdentity,
  getProfileServiceClient,
  normalizeProfileVisibility,
  type ViewerAccess,
} from '@/app/lib/profileIdentity'
import type { ActivityFeedItem } from '@/app/lib/communityPulseTypes'

type DetailProfileRow = {
  id: string
  email: string | null
  role: string | null
  created_at: string | null
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  city: string | null
  region: string | null
  country: string | null
  primary_club_id: string | null
  bio: string | null
  skill_level: string | null
  favorite_bag_style: string | null
  dominant_hand: string | null
  home_venue: string | null
  profile_visibility: string | null
}

type DetailClubRow = {
  id: string
  name: string
  logo_url: string | null
}

type RegistrationRow = {
  id: string
  event_id: string | null
  created_at: string | null
}

type LegacyUserRow = {
  id: string
  email?: string | null
  name?: string | null
  role?: string | null
  city?: string | null
  state?: string | null
  created_at?: string | null
}

type DetailEventRow = {
  id: string
  slug: string | null
  title: string
  city: string | null
  region: string | null
  country: string | null
  date: string | null
}

export type PlayerDetailProfile = {
  id: string
  email: string | null
  display_name: string | null
  name: string
  avatar_url: string | null
  city: string | null
  region: string | null
  country: string | null
  club: string | null
  primary_club_id: string | null
  club_name: string | null
  club_logo_url: string | null
  role: string | null
  bio: string | null
  skill_level: string | null
  favorite_bag_style: string | null
  dominant_hand: string | null
  home_venue: string | null
  profile_visibility: string | null
  created_at: string | null
}

export type PlayerDetailEvent = {
  id: string
  slug: string | null
  title: string
  city: string | null
  region: string | null
  country: string | null
  date: string | null
  locationLabel: string
}

export type PlayerDetailResult =
  | {
      status: 'ok'
      profile: PlayerDetailProfile
      upcomingEvents: PlayerDetailEvent[]
      recentActivity: ActivityFeedItem[]
      viewer: {
        isSelf: boolean
        isAdmin: boolean
      }
    }
  | {
      status: 'forbidden' | 'not_found'
      viewer: {
        isSelf: boolean
        isAdmin: boolean
      }
    }

function nowDateOnly() {
  return new Date().toISOString().slice(0, 10)
}

function isUpcoming(date: string | null) {
  return Boolean(date && date >= nowDateOnly())
}

function normalizeEventRow(row: Record<string, any>): DetailEventRow {
  return {
    id: String(row.id),
    slug: row.slug ? String(row.slug) : null,
    title: String(row.title ?? 'Event'),
    city: row.city ? String(row.city) : null,
    region: row.region ? String(row.region) : row.state ? String(row.state) : null,
    country: row.country ? String(row.country) : null,
    date: normalizeDateOnly(row.date),
  }
}

async function loadEventRowsByIds(eventIds: string[]) {
  if (eventIds.length === 0) return [] as DetailEventRow[]

  const supa = getProfileServiceClient()
  if (supa) {
    const selectAttempts = [
      'id,slug,title,city,region,country,date',
      'id,slug,title,city,region,date',
      'id,slug,title,city,region,state,country,date',
      'id,slug,title,city,state,country,date',
      'id,slug,title,city,state,date',
      'id,slug,title,city,date',
    ]

    for (const select of selectAttempts) {
      try {
        const { data, error } = await supa.from('events').select(select).in('id', eventIds)
        if (error) continue
        return ((data ?? []) as Record<string, any>[]).map(normalizeEventRow)
      } catch {
        // try narrower select
      }
    }
  }

  return eventIds
    .map((eventId) => devStore.getById<Record<string, any>>('events', eventId))
    .filter(Boolean)
    .map((row) => normalizeEventRow(row as Record<string, any>))
}

async function loadUpcomingEvents(profileId: string) {
  const toUpcomingEvents = (registrations: RegistrationRow[], events: DetailEventRow[]) => {
    const eventsById = new Map(events.map((event) => [event.id, event]))
    const seenEventIds = new Set<string>()

    return registrations
      .map((registration) => (registration.event_id ? eventsById.get(registration.event_id) ?? null : null))
      .filter(Boolean)
      .filter((event) => isUpcoming((event as DetailEventRow).date))
      .filter((event) => {
        const eventId = (event as DetailEventRow).id
        if (seenEventIds.has(eventId)) return false
        seenEventIds.add(eventId)
        return true
      })
      .sort((left, right) => String((left as DetailEventRow).date ?? '').localeCompare(String((right as DetailEventRow).date ?? '')))
      .slice(0, 5)
      .map((event) => {
        const row = event as DetailEventRow
        return {
          ...row,
          locationLabel: formatEventLocation(row.city, row.region),
        }
      })
  }

  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('registrations')
        .select('id,event_id,created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(25)

      if (!error) {
        const registrations = (data ?? []) as RegistrationRow[]
        const eventIds = Array.from(new Set(registrations.map((row) => row.event_id).filter(Boolean))) as string[]
        const events = await loadEventRowsByIds(eventIds)
        return toUpcomingEvents(registrations, events)
      }
    } catch {
      // fall through to dev store
    }
  }

  const registrations = devStore
    .getAll<Record<string, any>>('registrations')
    .filter((row) => row.user_id === profileId)
    .sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')))

  const eventIds = Array.from(new Set(registrations.map((row) => row.event_id).filter(Boolean))) as string[]
  const events = await loadEventRowsByIds(eventIds)
  return toUpcomingEvents(registrations as RegistrationRow[], events)
}

async function loadProfileRow(profileId: string) {
  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('profiles')
        .select(
          'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,country,primary_club_id,bio,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
        )
        .eq('id', profileId)
        .maybeSingle<DetailProfileRow>()

      if (!error && data) {
        return {
          profile: data,
          source: 'profiles' as const,
        }
      }
    } catch {
      // fall through to dev store
    }
  }

  const profile = devStore.getProfileById(profileId)
  if (profile?.id) {
    return {
      profile: {
        id: profile.id,
        email: profile.email ?? null,
        role: profile.role ?? null,
        created_at: profile.created_at ?? null,
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        display_name: profile.display_name ?? null,
        avatar_url: profile.avatar_url ?? null,
        city: profile.city ?? null,
        region: profile.region ?? null,
        country: profile.country ?? null,
        primary_club_id: profile.primary_club_id ?? null,
        bio: profile.bio ?? null,
        skill_level: profile.skill_level ?? null,
        favorite_bag_style: profile.favorite_bag_style ?? null,
        dominant_hand: profile.dominant_hand ?? null,
        home_venue: profile.home_venue ?? null,
        profile_visibility: profile.profile_visibility ?? 'public',
      } satisfies DetailProfileRow,
      source: 'devStore' as const,
    }
  }

  const legacyUser = devStore.getById<LegacyUserRow>('users', profileId)
  if (legacyUser?.id) {
    return {
      profile: {
        id: legacyUser.id,
        email: legacyUser.email ?? null,
        role: legacyUser.role ?? null,
        created_at: legacyUser.created_at ?? null,
        first_name: null,
        last_name: null,
        display_name: legacyUser.name ?? null,
        avatar_url: null,
        city: legacyUser.city ?? null,
        region: legacyUser.state ?? null,
        country: null,
        primary_club_id: null,
        bio: null,
        skill_level: null,
        favorite_bag_style: null,
        dominant_hand: null,
        home_venue: null,
        profile_visibility: 'public',
      } satisfies DetailProfileRow,
      source: 'legacyUsers' as const,
    }
  }

  return null
}

async function loadClubRow(clubId: string | null | undefined) {
  if (!clubId) return null

  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('clubs')
        .select('id,name,logo_url')
        .eq('id', clubId)
        .maybeSingle<DetailClubRow>()

      if (!error && data) return data
    } catch {
      // fall through to dev store
    }
  }

  const club = devStore.getById<Record<string, any>>('clubs', clubId)
  if (!club) return null

  return {
    id: String(club.id),
    name: String(club.name ?? 'Club'),
    logo_url: club.logo_url ? String(club.logo_url) : null,
  } satisfies DetailClubRow
}

export async function loadPlayerProfileDetail(input: {
  profileId: string
  viewer: ViewerAccess
}): Promise<PlayerDetailResult> {
  const isSelf = input.viewer.userId === input.profileId
  const isAdmin = canUseAdminTools(input.viewer.role)

  const loaded = await loadProfileRow(input.profileId)
  if (!loaded) {
    return {
      status: 'not_found',
      viewer: { isSelf, isAdmin },
    }
  }

  if (!canReadProfileIdentity(loaded.profile, input.viewer)) {
    return {
      status: 'forbidden',
      viewer: { isSelf, isAdmin },
    }
  }

  const [club, upcomingEvents, recentActivity] = await Promise.all([
    loadClubRow(loaded.profile.primary_club_id),
    loadUpcomingEvents(loaded.profile.id),
    listProfileActivity(
      loaded.profile.id,
      {
        profileId: input.viewer.userId,
        role: input.viewer.role,
        isAuthenticated: input.viewer.isAuthenticated,
      },
      10,
    ),
  ])

  const showPrivateMeta = isSelf || isAdmin
  const visibility = normalizeProfileVisibility(loaded.profile.profile_visibility)

  return {
    status: 'ok',
    profile: {
      id: loaded.profile.id,
      email: showPrivateMeta ? loaded.profile.email ?? null : null,
      display_name: loaded.profile.display_name ?? null,
      name: getProfileDisplayName(loaded.profile),
      avatar_url: loaded.profile.avatar_url ?? null,
      city: loaded.profile.city ?? null,
      region: loaded.profile.region ?? null,
      country: loaded.profile.country ?? null,
      club: club?.name ?? null,
      primary_club_id: loaded.profile.primary_club_id ?? null,
      club_name: club?.name ?? null,
      club_logo_url: club?.logo_url ?? null,
      role: loaded.profile.role ?? null,
      bio: loaded.profile.bio ?? null,
      skill_level: loaded.profile.skill_level ?? null,
      favorite_bag_style: loaded.profile.favorite_bag_style ?? null,
      dominant_hand: loaded.profile.dominant_hand ?? null,
      home_venue: loaded.profile.home_venue ?? null,
      profile_visibility: showPrivateMeta ? visibility : null,
      created_at: loaded.profile.created_at ?? null,
    },
    upcomingEvents,
    recentActivity,
    viewer: {
      isSelf,
      isAdmin,
    },
  }
}
