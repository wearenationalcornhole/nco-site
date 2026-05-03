export type EventRecord = {
  id: string
  slug: string | null
  title: string
  city: string | null
  date: string | null
  image: string | null
  logo_url?: string | null
  created_at?: string | null
}

export function slugifyEventTitle(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function normalizeDateOnly(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
    if (match) return match[1]
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
  return null
}

export function serializeEventRecord(event: Record<string, any>): EventRecord {
  return {
    id: String(event.id),
    slug: event.slug ?? null,
    title: String(event.title ?? ''),
    city: event.city ?? null,
    date: normalizeDateOnly(event.date),
    image: event.image ?? null,
    logo_url: event.logo_url ?? null,
    created_at:
      event.created_at instanceof Date
        ? event.created_at.toISOString()
        : event.created_at ?? null,
  }
}
