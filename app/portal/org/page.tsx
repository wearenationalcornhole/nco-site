// app/portal/org/page.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  createdAt?: string | null
}

type Registration = {
  id?: string
  eventId: string
  userId: string
  createdAt?: string
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

async function getBaseUrl() {
  // Next 15 headers() may be async in your setup—await to be safe
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https')
  const host =
    h.get('host') ??
    process.env.VERCEL_URL ??
    'localhost:3000'
  return `${proto}://${host}`
}

async function fetchEvents(): Promise<Event[]> {
  const base = await getBaseUrl()
  const res = await fetch(`${base}/portal/api/events`, { cache: 'no-store' })
  if (!res.ok) return []
  const json = await res.json()
  // Your /portal/api/events sometimes returns { source, events: [] }
  return Array.isArray(json) ? json : (json.events ?? [])
}

async function fetchRegCount(base: string, eventId: string): Promise<number> {
  try {
    const res = await fetch(`${base}/portal/api/events/${encodeURIComponent(eventId)}/registrations`, { cache: 'no-store' })
    if (!res.ok) return 0
    const rows = (await res.json()) as Registration[]
    return Array.isArray(rows) ? rows.length : 0
  } catch {
    return 0
  }
}

export default async function Page() {
  const base = await getBaseUrl()
  const events = await fetchEvents()

  // Basic stats
  const now = new Date()
  const toDate = (e: Event) => (e.date ? new Date(e.date + 'T00:00:00Z') : null)
  const upcoming = events.filter((e) => {
    const dt = toDate(e)
    return dt ? dt >= now : true
  })
  const past = events.filter((e) => {
    const dt = toDate(e)
    return dt ? dt < now : false
  })

  // Registration counts for first 10 events (keeps it fast)
  const top = events.slice(0, 10)
  const counts = await Promise.all(top.map((e) => fetchRegCount(base, e.id)))
  const regById = new Map(top.map((e, i) => [e.id, counts[i]]))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer</p>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Quick view of your events and activity.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/org/events"
            className="rounded bg-black text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Manage Events
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total Events</div>
          <div className="mt-1 text-3xl font-semibold">{events.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Upcoming</div>
          <div className="mt-1 text-3xl font-semibold">{upcoming.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Past</div>
          <div className="mt-1 text-3xl font-semibold">{past.length}</div>
        </div>
      </section>

      {/* Events table */}
      <section className="mt-8 rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Your Events</h2>
          <Link href="/portal/org/events" className="text-sm text-usaBlue hover:underline">
            View all
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-gray-600">No events yet. Create your first event from the Events page.</div>
        ) : (
          <div className="divide-y">
            {top.map((e) => (
              <div key={e.id} className="px-4 py-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <div className="font-medium text-gray-900">{e.title}</div>
                  <div className="text-sm text-gray-600">{e.city ?? 'TBD'}</div>
                </div>
                <div className="sm:col-span-3 text-sm text-gray-700">{fmtDate(e.date)}</div>
                <div className="sm:col-span-1 text-sm text-gray-700 text-right sm:text-left">
                  {(regById.get(e.id) ?? 0).toString()}
                </div>
                <div className="sm:col-span-2 flex sm:justify-end">
                  <div className="flex gap-2">
                    <Link
                      href={`/portal/org/events/${e.slug ?? e.id}`}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/portal/events/${e.slug ?? e.id}`}
                      className="rounded bg-usaBlue text-white px-3 py-1 text-sm hover:opacity-90"
                    >
                      Public
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}