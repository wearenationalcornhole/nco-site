import localEvents from '@/app/data/events.json'
import { formatEventLocation } from '@/app/lib/eventRecords'
import { getRequestOrigin } from '@/app/lib/site'

export type EventRecord = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  region?: string | null
  country?: string | null
  date?: string | null
  image?: string | null
  logo_url?: string | null
  createdAt?: string | null
}

export type SponsorLink = {
  id: string
  event_id: string
  company_id: string
  tier?: string | null
  created_at?: string | null
  sponsor_companies?: {
    id: string
    name: string
    website?: string | null
    logo_url?: string | null
  } | null
}

type LocalEvent = {
  slug: string
  title: string
  city?: string | null
  region?: string | null
  country?: string | null
  date?: string | null
  image?: string | null
}

function toLocalEventRecord(event: LocalEvent): EventRecord {
  return {
    id: event.slug,
    slug: event.slug,
    title: event.title,
    city: event.city ?? null,
    region: event.region ?? null,
    country: event.country ?? null,
    date: event.date ?? null,
    image: event.image ?? null,
    logo_url: null,
    createdAt: null,
  }
}

export { formatEventLocation }

export function formatEventDate(iso?: string | null) {
  if (!iso) return 'TBD'

  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1))

  if (Number.isNaN(date.getTime())) return 'TBD'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function normalizeEventsPayload(payload: unknown): EventRecord[] {
  if (Array.isArray(payload)) return payload as EventRecord[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { events?: unknown[] }).events)) {
    return (payload as { events: EventRecord[] }).events
  }
  return []
}

export async function fetchPublicEvents() {
  try {
    const base = await getRequestOrigin()
    const response = await fetch(`${base}/portal/api/events`, { cache: 'no-store' })
    if (response.ok) {
      return normalizeEventsPayload(await response.json())
    }
  } catch {
    // fall through to static data
  }

  return (localEvents as LocalEvent[]).map(toLocalEventRecord)
}

export async function fetchEventBySlug(slug: string) {
  try {
    const base = await getRequestOrigin()
    const response = await fetch(
      `${base}/portal/api/events/by-slug/${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    )
    if (response.ok) {
      return (await response.json()) as EventRecord
    }
  } catch {
    // fall through to static data
  }

  const localMatch = (localEvents as LocalEvent[]).find((event) => event.slug === slug)
  return localMatch ? toLocalEventRecord(localMatch) : null
}

export async function fetchEventSponsors(eventId: string) {
  try {
    const base = await getRequestOrigin()
    const response = await fetch(
      `${base}/portal/api/event-sponsors?eventId=${encodeURIComponent(eventId)}`,
      { cache: 'no-store' }
    )
    if (response.ok) {
      return (await response.json()) as SponsorLink[]
    }
  } catch {
    // ignore and return empty list
  }

  return []
}
