import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export type EventRecord = {
  id: string
  slug: string | null
  title: string
  city: string | null
  date: string | null
  image: string | null
  logo_url: string | null
  location: string | null
  start_time: string | null
  status: string | null
}

export type EventDivisionRecord = {
  id: string
  eventId: string
  name: string
  cap: number | null
  createdAt: string | null
}

type EventDbRow = {
  id: string
  slug?: string | null
  title: string
  city?: string | null
  date?: string | Date | null
  image?: string | null
  logo_url?: string | null
  location?: string | null
  start_time?: string | null
  status?: string | null
}

type DivisionDbRow = {
  id?: string
  event_id: string
  name: string
  cap: number | null
  created_at: string | Date | null
}

async function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) return null

  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizeDate(value: string | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  const plainDate = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  if (plainDate) return plainDate[1]

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function normalizeDateTime(value: string | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function toEventRecord(row: EventDbRow): EventRecord {
  return {
    id: row.id,
    slug: row.slug ?? null,
    title: row.title,
    city: row.city ?? null,
    date: normalizeDate(row.date),
    image: row.image ?? null,
    logo_url: row.logo_url ?? null,
    location: row.location ?? null,
    start_time: row.start_time ?? null,
    status: row.status ?? null,
  }
}

function toDivisionRecord(row: DivisionDbRow): EventDivisionRecord {
  return {
    id: row.id!,
    eventId: row.event_id,
    name: row.name,
    cap: row.cap ?? null,
    createdAt: normalizeDateTime(row.created_at),
  }
}

export async function getEventBySlug(slug: string): Promise<EventRecord | null> {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const columns = 'id,slug,title,city,date,image,logo_url,location,start_time,status'
    const { data: bySlug } = await supabase
      .from('events')
      .select(columns)
      .eq('slug', slug)
      .maybeSingle()

    if (bySlug) return toEventRecord(bySlug as EventDbRow)

    const { data: byId } = await supabase
      .from('events')
      .select(columns)
      .eq('id', slug)
      .maybeSingle()

    if (byId) return toEventRecord(byId as EventDbRow)
  }

  const prisma = await getPrisma()
  if (prisma) {
    const event = (await prisma.events.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
    })) as unknown as EventDbRow | null

    if (event) return toEventRecord(event)
  }

  const rows = devStore.getAll<EventDbRow>('events')
  const match =
    rows.find((row) => (row.slug ?? '').toLowerCase() === slug.toLowerCase()) ||
    rows.find((row) => row.id === slug)

  return match ? toEventRecord(match) : null
}

export async function getEventDivisions(eventId: string): Promise<EventDivisionRecord[]> {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const { data } = await supabase
      .from('event_divisions')
      .select('id,event_id,name,cap,created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (Array.isArray(data)) {
      return data.map((row) => toDivisionRecord(row as DivisionDbRow))
    }
  }

  const prisma = await getPrisma()
  if (prisma) {
    const rows = (await prisma.event_divisions.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: 'asc' },
    })) as unknown as DivisionDbRow[]

    return rows.map(toDivisionRecord)
  }

  return devStore
    .getAll<DivisionDbRow>('event_divisions')
    .filter((row) => row.event_id === eventId)
    .sort((a, b) => {
      const aDate = normalizeDateTime(a.created_at) ?? ''
      const bDate = normalizeDateTime(b.created_at) ?? ''
      return aDate.localeCompare(bDate)
    })
    .map(toDivisionRecord)
}
