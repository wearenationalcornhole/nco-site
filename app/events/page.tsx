// app/events/page.tsx
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

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

async function getBaseUrl() {
  const h = await headers()
  const proto =
    h.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'development' ? 'http' : 'https')
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
  return Array.isArray(json) ? json : (json.events ?? [])
}

export default async function Page() {
  const events = await fetchEvents()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Events</h1>
        <p className="text-gray-600 mt-1">
          Explore upcoming tournaments and local gatherings.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No events yet. Please check back soon.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl border bg-white overflow-hidden">
              <Link href={`/portal/events/${e.slug ?? e.id}`} className="block">
                {e.image ? (
                  <img
                    src={e.image}
                    alt=""
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100" />
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-gray-900 truncate">{e.title}</h2>
                  <div className="mt-1 text-sm text-gray-600">
                    {e.city ?? 'TBD'} • {fmtDate(e.date)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}