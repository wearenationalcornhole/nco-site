// app/events/page.tsx
import Link from 'next/link'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
}

type ListPayload = {
  total: number
  page: number
  pageSize: number
  events: Event[]
  source: 'db' | 'dev'
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

async function fetchEvents(params: { q?: string; page?: number; pageSize?: number; state?: string; month?: string }) {
  const qp = new URLSearchParams()
  if (params.q) qp.set('q', params.q)
  if (params.state) qp.set('state', params.state)
  if (params.month) qp.set('month', params.month)
  qp.set('page', String(params.page ?? 1))
  qp.set('pageSize', String(params.pageSize ?? 12))

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/portal/api/events?${qp.toString()}`, {
    // For a public listing, ISR could be used later. For now no-store for freshness.
    cache: 'no-store',
  })
  if (!res.ok) {
    return { total: 0, page: 1, pageSize: 12, events: [], source: 'db' } as ListPayload
  }
  return (await res.json()) as ListPayload
}

export default async function Page({ searchParams }: { searchParams?: Record<string, string> }) {
  const q = searchParams?.q ?? ''
  const state = searchParams?.state ?? ''
  const month = searchParams?.month ?? ''
  const page = Number(searchParams?.page ?? '1') || 1
  const pageSize = 12

  const data = await fetchEvents({ q, state, month, page, pageSize })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Find Events</h1>
          <p className="text-gray-600 mt-1">Search and discover upcoming cornhole events near you.</p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title/city…"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            name="state"
            defaultValue={state}
            placeholder="State (e.g. NC)"
            className="w-28 rounded border px-3 py-2 text-sm uppercase"
          />
          <input
            name="month"
            defaultValue={month}
            placeholder="Month (YYYY-MM)"
            className="w-36 rounded border px-3 py-2 text-sm"
          />
          <button className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90">
            Apply
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="mt-6">
        {data.events.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-gray-600">
            No events found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.events.map((e) => (
                <li key={e.id} className="rounded-2xl border overflow-hidden bg-white">
                  <div className="aspect-[16/9] bg-gray-100">
                    <img
                      src={e.image ?? '/images/hero-cornhole.webp'}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {e.city ?? 'TBD'} • {fmtDate(e.date)}
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/events/${e.slug ?? e.id}`}
                        className="inline-flex items-center rounded bg-usaBlue text-white px-3 py-1.5 text-sm hover:opacity-90"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pager */}
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </div>
              <div className="flex gap-2">
                <Link
                  href={{
                    pathname: '/events',
                    query: { q, state, month, page: Math.max(1, data.page - 1) },
                  }}
                  className={`rounded border px-3 py-1.5 text-sm ${data.page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
                >
                  Previous
                </Link>
                <Link
                  href={{
                    pathname: '/events',
                    query: { q, state, month, page: data.page + 1 },
                  }}
                  className={`rounded border px-3 py-1.5 text-sm ${data.page * data.pageSize >= data.total ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}