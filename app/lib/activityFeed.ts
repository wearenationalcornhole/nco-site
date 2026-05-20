import { devStore } from '@/app/lib/devStore'
import { getProfileDisplayName } from '@/app/lib/profileCapabilities'
import {
  getProfileServiceClient,
  listProfilesByIds,
  type ProfileIdentityRow,
} from '@/app/lib/profileIdentity'
import type {
  ActivityActorSummary,
  ActivityFeedItem,
  ActivityType,
  ActivityVisibility,
} from '@/app/lib/communityPulseTypes'

type ActivityViewer = {
  profileId: string | null
  role: string | null
  isAuthenticated: boolean
}

type ActivityRow = {
  id: string
  actor_profile_id: string | null
  activity_type: ActivityType
  entity_type: string | null
  entity_id: string | null
  title: string
  message: string | null
  metadata: Record<string, unknown> | null
  visibility: ActivityVisibility
  created_at: string | null
}

type ActivityCreateInput = {
  actorProfileId?: string | null
  activityType: ActivityType
  entityType?: string | null
  entityId?: string | null
  title: string
  message?: string | null
  metadata?: Record<string, unknown>
  visibility?: ActivityVisibility
}

type ActivityIdentity = Pick<
  ProfileIdentityRow,
  'id' | 'email' | 'display_name' | 'first_name' | 'last_name' | 'avatar_url' | 'city' | 'region'
>

type ProfileSummary = {
  id: string
  name: string
}

type EventSummary = {
  id: string
  title: string
  slug: string | null
  city: string | null
  region: string | null
  country: string | null
  date: string | null
}

function nowIso() {
  return new Date().toISOString()
}

function isMissingActivityFeedError(error: any) {
  const message = String(error?.message ?? '').toLowerCase()
  const code = String(error?.code ?? '').toLowerCase()
  return code === '42p01' || code === 'pgrst205' || message.includes('activity_feed')
}

function normalizeActivityRow(row: Record<string, any>): ActivityRow {
  return {
    id: String(row.id),
    actor_profile_id: row.actor_profile_id ? String(row.actor_profile_id) : null,
    activity_type: row.activity_type as ActivityType,
    entity_type: row.entity_type ? String(row.entity_type) : null,
    entity_id: row.entity_id ? String(row.entity_id) : null,
    title: String(row.title ?? ''),
    message: row.message ? String(row.message) : null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    visibility:
      row.visibility === 'public' || row.visibility === 'private' ? row.visibility : 'members',
    created_at:
      typeof row.created_at === 'string'
        ? row.created_at
        : row.created_at instanceof Date
          ? row.created_at.toISOString()
          : nowIso(),
  }
}

function canReadActivity(row: ActivityRow, viewer: ActivityViewer) {
  if (viewer.role === 'admin') return true
  if (row.visibility === 'public') return true
  if (row.visibility === 'members') return viewer.isAuthenticated
  return Boolean(viewer.profileId && row.actor_profile_id === viewer.profileId)
}

function toActorSummary(profile: ActivityIdentity | undefined): ActivityActorSummary | null {
  if (!profile) return null

  return {
    id: profile.id,
    name: getProfileDisplayName(profile),
    avatarUrl: profile.avatar_url ?? null,
    city: profile.city ?? null,
    region: profile.region ?? null,
  }
}

function toActivityFeedItem(row: ActivityRow, actor: ActivityActorSummary | null): ActivityFeedItem {
  return {
    id: row.id,
    actorProfileId: row.actor_profile_id,
    activityType: row.activity_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    message: row.message,
    metadata: row.metadata ?? {},
    visibility: row.visibility,
    createdAt: row.created_at ?? nowIso(),
    actor,
  }
}

async function getProfileSummary(profileId: string) {
  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('profiles')
        .select('id,email,display_name,first_name,last_name')
        .eq('id', profileId)
        .maybeSingle<ActivityIdentity>()

      if (!error && data) {
        return {
          id: data.id,
          name: getProfileDisplayName(data),
        } satisfies ProfileSummary
      }
    } catch {
      // fall through to dev store
    }
  }

  const profile = devStore.getProfileById(profileId)
  if (profile) {
    return {
      id: profileId,
      name: getProfileDisplayName(profile),
    } satisfies ProfileSummary
  }

  const legacyUser = devStore.getById<any>('users', profileId)
  if (legacyUser) {
    return {
      id: profileId,
      name: getProfileDisplayName({
        display_name: legacyUser.name ?? null,
        first_name: null,
        last_name: null,
        email: legacyUser.email ?? null,
      }),
    } satisfies ProfileSummary
  }

  return {
    id: profileId,
    name: 'NCO Player',
  } satisfies ProfileSummary
}

async function getEventSummary(eventId: string) {
  const supa = getProfileServiceClient()
  if (supa) {
    const selectAttempts = [
      'id,title,slug,city,region,country,date',
      'id,title,slug,city,region,date',
      'id,title,slug,city,region,state,country,date',
      'id,title,slug,city,state,country,date',
      'id,title,slug,city,state,date',
      'id,title,slug,city,date',
    ]

    for (const select of selectAttempts) {
      try {
        const { data, error } = await supa
          .from('events')
          .select(select)
          .eq('id', eventId)
          .maybeSingle<Record<string, any>>()

        if (error) {
          if (isMissingActivityFeedError(error)) return null
          continue
        }

        if (data) {
          return {
            id: String(data.id),
            title: String(data.title ?? 'Event'),
            slug: data.slug ? String(data.slug) : null,
            city: data.city ? String(data.city) : null,
            region: data.region ? String(data.region) : data.state ? String(data.state) : null,
            country: data.country ? String(data.country) : null,
            date: data.date ? String(data.date).slice(0, 10) : null,
          } satisfies EventSummary
        }
      } catch {
        // try narrower select
      }
    }
  }

  const event = devStore.getById<any>('events', eventId)
  if (!event) return null

  return {
    id: String(event.id),
    title: String(event.title ?? 'Event'),
    slug: event.slug ? String(event.slug) : null,
    city: event.city ? String(event.city) : null,
    region: event.region ? String(event.region) : event.state ? String(event.state) : null,
    country: event.country ? String(event.country) : null,
    date: event.date ? String(event.date).slice(0, 10) : null,
  } satisfies EventSummary
}

async function listVisibleActivityRows(viewer: ActivityViewer, limit: number) {
  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.max(limit * 4, 40))

      if (error) {
        if (isMissingActivityFeedError(error)) return []
        throw error
      }

      return ((data ?? []) as Record<string, any>[])
        .map(normalizeActivityRow)
        .filter((row) => canReadActivity(row, viewer))
        .slice(0, limit)
    } catch (error) {
      console.error('listVisibleActivityRows failed:', error)
      return []
    }
  }

  return devStore
    .getAll<Record<string, any>>('activity_feed')
    .map(normalizeActivityRow)
    .sort((left, right) => (right.created_at ?? '').localeCompare(left.created_at ?? ''))
    .filter((row) => canReadActivity(row, viewer))
    .slice(0, limit)
}

async function listActivityRowsForProfile(profileId: string, viewer: ActivityViewer, limit: number) {
  const rows = await listVisibleActivityRows(viewer, Math.max(limit * 2, 20))
  return rows.filter((row) => row.actor_profile_id === profileId).slice(0, limit)
}

async function hydrateActivityItems(rows: ActivityRow[]) {
  const actorIds = Array.from(new Set(rows.map((row) => row.actor_profile_id).filter(Boolean))) as string[]
  const supa = getProfileServiceClient()
  const actorsById = new Map<string, ActivityActorSummary>()

  if (supa && actorIds.length > 0) {
    try {
      const { profilesById } = await listProfilesByIds(supa, actorIds)
      for (const [profileId, profile] of profilesById.entries()) {
        const actor = toActorSummary(profile as ActivityIdentity)
        if (actor) actorsById.set(profileId, actor)
      }
    } catch (error) {
      console.error('hydrateActivityItems profile lookup failed:', error)
    }
  }

  if (actorIds.length > 0) {
    for (const actorId of actorIds) {
      if (actorsById.has(actorId)) continue
      const profile = devStore.getProfileById(actorId)
      if (profile) {
        actorsById.set(
          actorId,
          toActorSummary({
            id: actorId,
            email: profile.email ?? null,
            display_name: profile.display_name ?? null,
            first_name: profile.first_name ?? null,
            last_name: profile.last_name ?? null,
            avatar_url: profile.avatar_url ?? null,
            city: profile.city ?? null,
            region: profile.region ?? null,
          }) ?? {
            id: actorId,
            name: getProfileDisplayName(profile),
            avatarUrl: profile.avatar_url ?? null,
            city: profile.city ?? null,
            region: profile.region ?? null,
          },
        )
      }
    }
  }

  return rows.map((row) => toActivityFeedItem(row, row.actor_profile_id ? actorsById.get(row.actor_profile_id) ?? null : null))
}

export async function createActivity(input: ActivityCreateInput) {
  const row = {
    actor_profile_id: input.actorProfileId ?? null,
    activity_type: input.activityType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    title: input.title,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
    visibility: input.visibility ?? 'members',
  }

  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { error } = await supa.from('activity_feed').insert(row)
      if (!error) return true
      if (!isMissingActivityFeedError(error)) {
        console.error('createActivity insert failed:', error)
      }
      return false
    } catch (error) {
      console.error('createActivity insert threw:', error)
      return false
    }
  }

  try {
    devStore.upsert('activity_feed', {
      ...row,
      created_at: nowIso(),
    })
    return true
  } catch (error) {
    console.error('createActivity devStore failed:', error)
    return false
  }
}

export async function createActivityIfNotExists(input: ActivityCreateInput) {
  if (!input.entityType || !input.entityId) {
    return createActivity(input)
  }

  const supa = getProfileServiceClient()
  if (supa) {
    try {
      const { data, error } = await supa
        .from('activity_feed')
        .select('id')
        .eq('activity_type', input.activityType)
        .eq('entity_type', input.entityType)
        .eq('entity_id', input.entityId)
        .limit(1)
        .maybeSingle()

      if (!error && data?.id) return false
      if (error && !isMissingActivityFeedError(error)) {
        console.error('createActivityIfNotExists lookup failed:', error)
      }
    } catch (error) {
      console.error('createActivityIfNotExists lookup threw:', error)
    }
  } else {
    const existing = devStore
      .getAll<Record<string, any>>('activity_feed')
      .find(
        (row) =>
          row.activity_type === input.activityType &&
          row.entity_type === input.entityType &&
          row.entity_id === input.entityId,
      )

    if (existing) return false
  }

  return createActivity(input)
}

export async function listCommunityActivity(viewer: ActivityViewer, limit = 20) {
  const rows = await listVisibleActivityRows(viewer, limit)
  return hydrateActivityItems(rows)
}

export async function listProfileActivity(profileId: string, viewer: ActivityViewer, limit = 20) {
  const rows = await listActivityRowsForProfile(profileId, viewer, limit)
  return hydrateActivityItems(rows)
}

export async function emitEventCreatedActivity(input: {
  actorProfileId: string
  eventId: string
  eventTitle?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  date?: string | null
}) {
  const [actor, event] = await Promise.all([
    getProfileSummary(input.actorProfileId),
    input.eventTitle
      ? Promise.resolve({
          id: input.eventId,
          title: input.eventTitle,
          slug: null,
          city: input.city ?? null,
          region: input.region ?? null,
          country: input.country ?? null,
          date: input.date ?? null,
        } satisfies EventSummary)
      : getEventSummary(input.eventId),
  ])

  const eventTitle = input.eventTitle ?? event?.title ?? 'an event'

  return createActivityIfNotExists({
    actorProfileId: input.actorProfileId,
    activityType: 'event_created',
    entityType: 'event',
    entityId: input.eventId,
    title: 'New event created',
    message: `${actor.name} created ${eventTitle}.`,
    metadata: {
      event_id: input.eventId,
      event_title: eventTitle,
      city: input.city ?? event?.city ?? null,
      region: input.region ?? event?.region ?? null,
      country: input.country ?? event?.country ?? null,
      date: input.date ?? event?.date ?? null,
    },
    visibility: 'members',
  })
}

export async function emitEventRegisteredActivity(input: {
  actorProfileId: string
  eventId: string
  registrationId: string
  division?: string | null
}) {
  const [actor, event] = await Promise.all([getProfileSummary(input.actorProfileId), getEventSummary(input.eventId)])
  const eventTitle = event?.title ?? 'an event'

  return createActivityIfNotExists({
    actorProfileId: input.actorProfileId,
    activityType: 'event_registered',
    entityType: 'registration',
    entityId: input.registrationId,
    title: 'New event registration',
    message: `${actor.name} registered for ${eventTitle}.`,
    metadata: {
      event_id: input.eventId,
      event_title: eventTitle,
      division: input.division ?? null,
      event_slug: event?.slug ?? null,
      city: event?.city ?? null,
      region: event?.region ?? null,
      country: event?.country ?? null,
    },
    visibility: 'members',
  })
}

export async function emitBagProofGeneratedActivity(input: {
  actorProfileId: string
  designId: string
  eventId?: string | null
  clubId?: string | null
}) {
  const actor = await getProfileSummary(input.actorProfileId)

  return createActivityIfNotExists({
    actorProfileId: input.actorProfileId,
    activityType: 'bag_proof_generated',
    entityType: 'bag_design',
    entityId: input.designId,
    title: 'Bag proof generated',
    message: `${actor.name} generated a custom bag proof.`,
    metadata: {
      // Keep V1 metadata free of proof or art asset URLs. `bag_design_created` is
      // intentionally reserved for future use; the community feed only emits once
      // a design has progressed to a meaningful proof-generation step.
      bag_design_id: input.designId,
      event_id: input.eventId ?? null,
      club_id: input.clubId ?? null,
      proof_generated: true,
    },
    visibility: 'members',
  })
}

export async function emitProfileJoinedActivity(profileId: string) {
  const actor = await getProfileSummary(profileId)

  return createActivityIfNotExists({
    actorProfileId: profileId,
    activityType: 'profile_joined',
    entityType: 'profile',
    entityId: profileId,
    title: 'New player joined',
    message: `${actor.name} joined NCO.`,
    metadata: {
      profile_id: profileId,
    },
    visibility: 'members',
  })
}
