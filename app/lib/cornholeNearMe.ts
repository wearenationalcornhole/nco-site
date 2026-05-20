import localEvents from '@/app/data/events.json'
import { listCommunityClubs } from '@/app/lib/communityData'
import { devStore } from '@/app/lib/devStore'
import { getProfileDisplayName } from '@/app/lib/profileCapabilities'
import { getProfileServiceClient } from '@/app/lib/profileIdentity'
import type {
  CornholeNearMeResult,
  NearMeClub,
  NearMeEvent,
  NearMeMatchLevel,
  NearMePlayer,
} from '@/app/lib/communityPulseTypes'

type ViewerLocationProfile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  display_name: string | null
  city: string | null
  region: string | null
  country: string | null
}

type EventLocationRow = {
  id: string
  slug: string | null
  title: string
  city: string | null
  region: string | null
  country: string | null
  date: string | null
  image: string | null
  created_at: string | null
}

type ClubLocationRow = {
  id: string
  name: string
  city: string | null
  region: string | null
  website: string | null
  logo_url: string | null
}

type PlayerLocationRow = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  display_name: string | null
  city: string | null
  region: string | null
  avatar_url: string | null
  primary_club_id: string | null
  skill_level: string | null
  profile_visibility: string | null
  is_profile_complete: boolean | null
  updated_at: string | null
  created_at: string | null
}

type MatchResult = {
  score: number
  level: NearMeMatchLevel
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function formatLocationLabel(city: string | null, region: string | null) {
  if (city && region) return `Near ${city}, ${region}`
  if (city) return `Near ${city}`
  if (region) return `In ${region}`
  return null
}

function isUpcoming(date: string | null) {
  if (!date) return false
  return date >= new Date().toISOString().slice(0, 10)
}

function matchesLocation(
  rowCity: string | null | undefined,
  rowRegion: string | null | undefined,
  profileCity: string | null | undefined,
  profileRegion: string | null | undefined,
): MatchResult {
  const city = normalizeText(rowCity)
  const region = normalizeText(rowRegion)
  const targetCity = normalizeText(profileCity)
  const targetRegion = normalizeText(profileRegion)
  const cityContainsRegion = city && targetRegion ? city.includes(targetRegion) : false
  const cityContainsCity = city && targetCity ? city.includes(targetCity) : false

  if (targetCity && city && city === targetCity) {
    return { score: 100, level: 'city' }
  }

  if (cityContainsCity) {
    return { score: 95, level: 'city' }
  }

  if (targetRegion && region && region === targetRegion) {
    return { score: 70, level: 'region' }
  }

  if (cityContainsRegion) {
    return { score: 65, level: 'region' }
  }

  return { score: 0, level: 'fallback' }
}

function matchesEventLocation(
  event: Pick<EventLocationRow, 'city' | 'region' | 'country'>,
  profileCity: string | null | undefined,
  profileRegion: string | null | undefined,
  profileCountry: string | null | undefined,
): MatchResult {
  const city = normalizeText(event.city)
  const region = normalizeText(event.region)
  const country = normalizeText(event.country)
  const targetCity = normalizeText(profileCity)
  const targetRegion = normalizeText(profileRegion)
  const targetCountry = normalizeText(profileCountry)

  if (country && targetCountry && country !== targetCountry) {
    return { score: 0, level: 'fallback' }
  }

  if (region) {
    if (targetRegion && region === targetRegion) {
      if (targetCity && city && city === targetCity) {
        return { score: 120, level: 'city' }
      }

      if (targetCity && city && city.includes(targetCity)) {
        return { score: 115, level: 'city' }
      }

      return { score: 100, level: 'region' }
    }

    if (targetCity && city && city === targetCity) {
      return { score: 90, level: 'city' }
    }

    if (targetCity && city && city.includes(targetCity)) {
      return { score: 85, level: 'city' }
    }

    return { score: 0, level: 'fallback' }
  }

  return matchesLocation(event.city, null, profileCity, profileRegion)
}

function sortByMatchAndDate<T extends { matchScore: number; date?: string | null; title?: string; name?: string }>(items: T[]) {
  return items.sort((left, right) => {
    if (right.matchScore !== left.matchScore) return right.matchScore - left.matchScore
    if (left.date && right.date && left.date !== right.date) return left.date.localeCompare(right.date)
    return String(left.title ?? left.name ?? '').localeCompare(String(right.title ?? right.name ?? ''))
  })
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

async function loadViewerProfile(profileId: string) {
  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('profiles')
        .select('id,email,first_name,last_name,display_name,city,region,country')
        .eq('id', profileId)
        .maybeSingle<ViewerLocationProfile>()

      if (!error && data) return data
    } catch {
      // fall through to devStore
    }
  }

  const profile = devStore.getProfileById(profileId)
  if (!profile) return null

  return {
    id: String(profile.id),
    email: profile.email ?? null,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    display_name: profile.display_name ?? null,
    city: profile.city ?? null,
    region: profile.region ?? null,
    country: profile.country ?? null,
  } satisfies ViewerLocationProfile
}

async function loadEventRows() {
  const supa = getProfileServiceClient()
  if (supa) {
    const selectAttempts = [
      'id,slug,title,city,region,country,date,image,created_at',
      'id,slug,title,city,region,date,image,created_at',
      'id,slug,title,city,region,state,country,date,image,created_at',
      'id,slug,title,city,state,country,date,image,created_at',
      'id,slug,title,city,state,date,image,created_at',
      'id,slug,title,city,date,image,created_at',
    ]

    for (const select of selectAttempts) {
      try {
        const { data, error } = await supa
          .from('events')
          .select(select)
          .order('date', { ascending: true })
          .limit(50)

        if (error) continue

        return ((data ?? []) as Record<string, any>[]).map((row) => ({
          id: String(row.id),
          slug: row.slug ? String(row.slug) : null,
          title: String(row.title ?? ''),
          city: row.city ? String(row.city) : null,
          region: row.region ? String(row.region) : row.state ? String(row.state) : null,
          country: row.country ? String(row.country) : null,
          date: row.date ? String(row.date).slice(0, 10) : null,
          image: row.image ? String(row.image) : null,
          created_at: row.created_at ? String(row.created_at) : null,
        })) satisfies EventLocationRow[]
      } catch {
        // try narrower select
      }
    }
  }

  const devEvents = devStore.getAll<Record<string, any>>('events')
  if (devEvents.length > 0) {
    return devEvents.map((row) => ({
      id: String(row.id),
      slug: row.slug ? String(row.slug) : null,
      title: String(row.title ?? ''),
      city: row.city ? String(row.city) : null,
      region: row.region ? String(row.region) : row.state ? String(row.state) : null,
      country: row.country ? String(row.country) : null,
      date: row.date ? String(row.date).slice(0, 10) : null,
      image: row.image ? String(row.image) : null,
      created_at: row.created_at ? String(row.created_at) : null,
    })) satisfies EventLocationRow[]
  }

  return (localEvents as Array<Record<string, any>>).map((row, index) => ({
    id: row.id ? String(row.id) : `seed-event-${index + 1}`,
    slug: row.slug ? String(row.slug) : null,
    title: String(row.title ?? ''),
    city: row.city ? String(row.city) : null,
    region: row.region ? String(row.region) : null,
    country: row.country ? String(row.country) : 'US',
    date: row.date ? String(row.date).slice(0, 10) : null,
    image: row.image ? String(row.image) : null,
    created_at: null,
  })) satisfies EventLocationRow[]
}

async function loadClubRows() {
  const supa = getProfileServiceClient()
  if (supa) {
    const selectAttempts = [
      'id,name,city,region,state,website,logo_url',
      'id,name,city,state,website,logo_url',
      'id,name,city,website,logo_url',
    ]

    for (const select of selectAttempts) {
      try {
        const { data, error } = await supa
          .from('clubs')
          .select(select)
          .order('name', { ascending: true })
          .limit(100)

        if (error) continue

        return ((data ?? []) as Record<string, any>[]).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? ''),
          city: row.city ? String(row.city) : null,
          region: row.region ? String(row.region) : row.state ? String(row.state) : null,
          website: row.website ? String(row.website) : null,
          logo_url: row.logo_url ? String(row.logo_url) : null,
        })) satisfies ClubLocationRow[]
      } catch {
        // try narrower select
      }
    }
  }

  const devClubs = devStore.getAll<Record<string, any>>('clubs')
  if (devClubs.length > 0) {
    return devClubs.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      city: row.city ? String(row.city) : null,
      region: row.region ? String(row.region) : row.state ? String(row.state) : null,
      website: row.website ? String(row.website) : null,
      logo_url: row.logo_url ? String(row.logo_url) : null,
    })) satisfies ClubLocationRow[]
  }

  const seedClubs = await listCommunityClubs()
  return seedClubs.map((club) => ({
    id: club.id,
    name: club.name,
    city: club.city,
    region: club.state,
    website: club.website,
    logo_url: club.logoUrl,
  })) satisfies ClubLocationRow[]
}

async function loadPlayerRows() {
  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('profiles')
        .select(
          'id,email,first_name,last_name,display_name,city,region,avatar_url,primary_club_id,skill_level,profile_visibility,is_profile_complete,updated_at,created_at',
        )
        .order('updated_at', { ascending: false })
        .limit(100)

      if (!error) {
        return (data ?? []) as PlayerLocationRow[]
      }
    } catch {
      // fall through
    }
  }

  return devStore.listProfiles().map((profile) => ({
    id: String(profile.id),
    email: profile.email ?? null,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    display_name: profile.display_name ?? null,
    city: profile.city ?? null,
    region: profile.region ?? null,
    avatar_url: profile.avatar_url ?? null,
    primary_club_id: profile.primary_club_id ?? null,
    skill_level: profile.skill_level ?? null,
    profile_visibility: profile.profile_visibility ?? 'public',
    is_profile_complete: profile.is_profile_complete ?? false,
    updated_at: profile.updated_at ?? null,
    created_at: profile.created_at ?? null,
  })) satisfies PlayerLocationRow[]
}

export async function getCornholeNearMe(input: {
  currentProfileId: string
  profileCity?: string | null
  profileRegion?: string | null
  profileCountry?: string | null
}) {
  const viewerProfile =
    input.profileCity !== undefined || input.profileRegion !== undefined || input.profileCountry !== undefined
      ? {
          id: input.currentProfileId,
          email: null,
          first_name: null,
          last_name: null,
          display_name: null,
          city: input.profileCity ?? null,
          region: input.profileRegion ?? null,
          country: input.profileCountry ?? null,
        }
      : await loadViewerProfile(input.currentProfileId)

  const profileCity = viewerProfile?.city ?? null
  const profileRegion = viewerProfile?.region ?? null
  const profileCountry = viewerProfile?.country ?? null
  const locationLabel = formatLocationLabel(profileCity, profileRegion)
  const needsLocationSetup = !profileCity && !profileRegion

  if (needsLocationSetup) {
    return {
      locationLabel,
      needsLocationSetup: true,
      discoveryNote: profileCountry ? `Add your city or region to unlock local cornhole discovery in ${profileCountry}.` : null,
      nearbyEvents: [],
      nearbyClubs: [],
      nearbyPlayers: [],
    } satisfies CornholeNearMeResult
  }

  const [eventRows, clubRows, playerRows] = await Promise.all([loadEventRows(), loadClubRows(), loadPlayerRows()])

  const clubsById = new Map(clubRows.map((club) => [club.id, club.name]))

  const matchedEvents = sortByMatchAndDate(
    eventRows
      .filter((event) => isUpcoming(event.date))
      .map((event) => {
        const match = matchesEventLocation(event, profileCity, profileRegion, profileCountry)
        return {
          ...event,
          matchScore: match.score,
          matchLevel: match.level,
        }
      })
      .filter((event) => event.matchScore > 0),
  )

  const matchedClubs = matchedEvents.length >= 0
    ? sortByMatchAndDate(
        clubRows
          .map((club) => {
            const match = matchesLocation(club.city, club.region, profileCity, profileRegion)
            return {
              ...club,
              matchScore: match.score,
              matchLevel: match.level,
            }
          })
          .filter((club) => club.matchScore > 0),
      )
    : []

  const matchedPlayers = playerRows
    .filter((player) => player.id !== input.currentProfileId)
    .filter((player) => player.is_profile_complete)
    .filter((player) => player.profile_visibility !== 'private')
    .map((player) => {
      const match = matchesLocation(player.city, player.region, profileCity, profileRegion)
      return {
        ...player,
        matchScore: match.score,
        matchLevel: match.level,
      }
    })
    .filter((player) => player.matchScore > 0)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) return right.matchScore - left.matchScore
      return String(right.updated_at ?? right.created_at ?? '').localeCompare(String(left.updated_at ?? left.created_at ?? ''))
    })

  const fallbackEvents = matchedEvents.length
    ? []
    : eventRows
        .filter((event) => isUpcoming(event.date))
        .sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')))
        .slice(0, 5)
        .map((event) => ({
          ...event,
          matchLevel: 'fallback' as const,
        }))

  const nearbyEvents = dedupeById(
    (matchedEvents.slice(0, 5) as Array<EventLocationRow & { matchLevel: NearMeMatchLevel }>).concat(fallbackEvents),
  ).slice(0, 5)

  const nearbyClubs = matchedClubs.slice(0, 5)
  const nearbyPlayers = matchedPlayers.slice(0, 8)

  const discoveryNote =
    nearbyEvents.length === 0 && nearbyClubs.length === 0 && nearbyPlayers.length === 0
      ? `We don't have a strong local match for ${locationLabel ?? 'your area'} yet.`
      : matchedEvents.length === 0 && fallbackEvents.length > 0
        ? `Showing broader upcoming events while local listings build out for ${locationLabel ?? 'your area'}.`
        : null

  return {
    locationLabel,
    needsLocationSetup: false,
    discoveryNote,
    nearbyEvents: nearbyEvents.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      city: event.city,
      region: event.region,
      country: event.country,
      date: event.date,
      image: event.image,
      matchLevel: event.matchLevel,
    })) satisfies NearMeEvent[],
    nearbyClubs: nearbyClubs.map((club) => ({
      id: club.id,
      name: club.name,
      city: club.city,
      region: club.region,
      website: club.website,
      logoUrl: club.logo_url,
      matchLevel: club.matchLevel,
    })) satisfies NearMeClub[],
    nearbyPlayers: nearbyPlayers.map((player) => ({
      id: player.id,
      name: getProfileDisplayName(player),
      city: player.city,
      region: player.region,
      avatarUrl: player.avatar_url ?? null,
      clubName: player.primary_club_id ? clubsById.get(player.primary_club_id) ?? null : null,
      skillLevel: player.skill_level ?? null,
      matchLevel: player.matchLevel,
    })) satisfies NearMePlayer[],
  } satisfies CornholeNearMeResult
}
