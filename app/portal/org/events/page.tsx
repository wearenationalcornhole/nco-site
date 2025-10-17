// app/portal/org/events/page.tsx
import Link from 'next/link'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
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

async function fetchEvents(): Promise<Event[]> {
  // Relative fetch works at runtime for app routes
  const res = await fetch('/portal/api/events', { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function Page({
  searchParams,
}: {
  // Next 15 expects a Promise here
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = (sp?.q ?? '').trim().toLowerCase()

  const all = await fetchEvents()
  const events = all.filter((e) => {
    if (!q) return true
    const hay = `${e.title} ${e.city ?? ''} ${e.slug ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer</p>
          <h1 className="text-2xl font-semibold">Your Events</h1>
        </div>

        {/* simple GET search */}
        <form className="flex items-center gap-2" action="/portal/org/events" method="get">
          <input
            type="text"
            name="q"
            defaultValue={sp?.q ?? ''}
            placeholder="Search events…"
            className="rounded border px-3 py-2 text-sm"
            aria-label="Search events"
          />
          <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50">Search</button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full rounded-xl border bg-white p-6 text-gray-600">
            {q ? 'No events match your search.' : 'No events yet.'}
          </div>
        ) : (
          events.map((e) => (
            <article key={e.id} className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
              <h3 className="text-xl font-bold">{e.title}</h3>
              <p className="text-gray-600">
                {(e.city ?? 'TBD')} • {fmtDate(e.date)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  className="rounded-full bg-black px-4 py-2 text-white text-sm hover:opacity-90"
                  href={`/portal/org/events/${e.slug ?? e.id}`}
                >
                  Manage
                </Link>
                <Link
                  className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
                  href={`/portal/events/${e.slug ?? e.id}`}
                >
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