// app/portal/org/events/page.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  createdAt?: string | null
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

async function fetchEvents(): Promise<{ events: Event[]; source?: string; error?: string }> {
  try {
    const h = await headers(); // ← await fixes the type error
    const host = h.get('host') || process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'wearenationalcornhole.com'
    const proto = h.get('x-forwarded-proto') || 'https'
    const base = `${proto}://${host}`

    const res = await fetch(`${base}/portal/api/events`, { cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { events: [], error: `API ${res.status}`, source: `fetch-failed: ${body.slice(0, 120)}` }
    }
    const json = await res.json().catch(() => ({}))
    const events = Array.isArray(json) ? json : (json.events ?? [])
    return { events, source: (json as any).source ?? 'api' }
  } catch (e: any) {
    return { events: [], error: e?.message ?? 'unknown error', source: 'exception' }
  }
}

export default async function Page() {
  const { events, error } = await fetchEvents()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer · Events</p>
          <h1 className="text-2xl font-semibold">Your Events</h1>
          {error ? (
            <p className="mt-1 text-sm text-red-600">Failed to load events. Please try again in a moment.</p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">Manage tournaments, sponsors, and bag submissions.</p>
          )}
        </div>

        <Link href="/portal/org/events/new" className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90">
          + Create Event
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border bg-white p-6 text-gray-600">
            {error ? 'No events could be loaded right now.' : 'No events yet. Click “Create Event” to add your first tournament.'}
          </div>
        ) : (
          events.map((e) => (
            <article key={e.id} className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
                <img
                  src={e.image ?? '/images/tournament-1.jpg'}
                  alt={e.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold">{e.title}</h3>
              <p className="text-gray-600">{(e.city ?? 'TBD') + ' • ' + fmtDate(e.date)}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Link href={`/portal/org/events/${e.slug ?? e.id}`} className="rounded-full bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90">
                  Manage
                </Link>
                <Link href={`/portal/events/${e.slug ?? e.id}`} className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50">
                  View Public
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}