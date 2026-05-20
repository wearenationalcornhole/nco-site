export type ActivityType =
  | 'profile_joined'
  | 'event_created'
  | 'event_registered'
  | 'club_created'
  | 'club_joined'
  | 'bag_design_created'
  | 'bag_proof_generated'
  | 'badge_earned'
  | 'general'

export type ActivityVisibility = 'public' | 'members' | 'private'

export type ActivityActorSummary = {
  id: string
  name: string
  avatarUrl: string | null
  city: string | null
  region: string | null
}

export type ActivityFeedItem = {
  id: string
  actorProfileId: string | null
  activityType: ActivityType
  entityType: string | null
  entityId: string | null
  title: string
  message: string | null
  metadata: Record<string, unknown>
  visibility: ActivityVisibility
  createdAt: string
  actor: ActivityActorSummary | null
}

export type NearMeMatchLevel = 'city' | 'region' | 'fallback'

export type NearMeEvent = {
  id: string
  slug: string | null
  title: string
  city: string | null
  region: string | null
  country: string | null
  date: string | null
  image: string | null
  matchLevel: NearMeMatchLevel
}

export type NearMeClub = {
  id: string
  name: string
  city: string | null
  region: string | null
  website: string | null
  logoUrl: string | null
  matchLevel: NearMeMatchLevel
}

export type NearMePlayer = {
  id: string
  name: string
  city: string | null
  region: string | null
  avatarUrl: string | null
  clubName: string | null
  skillLevel: string | null
  matchLevel: NearMeMatchLevel
}

export type CornholeNearMeResult = {
  locationLabel: string | null
  needsLocationSetup: boolean
  discoveryNote: string | null
  nearbyEvents: NearMeEvent[]
  nearbyClubs: NearMeClub[]
  nearbyPlayers: NearMePlayer[]
}
