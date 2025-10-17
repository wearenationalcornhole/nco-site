// app/portal/org/events/page.tsx
import Link from 'next/link'
import CreateEventButton from './components/CreateEventButton'
import SearchBar from './components/SearchBar'
import DeleteEventButton from './components/DeleteEventButton'
import EditEventDialog from './components/EditEventDialog'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

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

async function fetchEvents(q: string, page: number, pageSize: number) {
  const prisma = await getPrisma()
  if (prisma) {
    const where = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}

    const [total, rows] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, slug: true, title: true, city: true, date: true, image: true, createdAt: true },
      }),
    ])
    return { total, rows: rows as unknown as Event[] }
  }

  // Fallback: devStore
  const all = devStore
    .getAll<Event>('events')
    .filter((e) => {
      if (!q) return true
      const hay = `${e.title} ${e.city ?? ''} ${e.slug ?? ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .sort((a, b) => (b.createdAt?.localeCompare?.(a.createdAt ?? '') ?? 0))

  const total = all.length
  const start = (page - 1) * pageSize
  const rows = all.slice(start, start + pageSize)
  return { total, rows }
}

export default async function OrgEventsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string }
}) {
  const q = (searchParams?.q ?? '').trim()
  const page = Math.max(parseInt(searchParams?.page ?? '1', 10) || 1, 1)
  const pageSize = 9

  const { total, rows: events } = await fetchEvents(q, page, pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer</p>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-gray-600">Create and manage your tournaments.</p>
        </div>
        <CreateEventButton />
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SearchBar initialQuery={q} />
        <div className="text-sm text-gray-600">{total} result{total === 1 ? '' : 's'}</div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full rounded-xl border bg-white p-6 text-center text-gray-600">
            {q ? 'No events match your search.' : 'No events yet. Click Create Event to get started.'}
          </div>
        ) : (
          events.map((e) => {
            const slugOrId = e.slug ?? e.id
            return (
              <article key={e.id} className="group rounded-2xl bg-white p-6 shadow ring-1 ring-black/5 transition hover:shadow-lg">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
                  <img
                    src={e.image ?? '/images/tournament-1.jpg'}
                    alt={e.title}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold">{e.title}</h3>
                <p className="text-gray-600">{e.city ?? 'TBD'} • {fmtDate(e.date)}</p>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link className="rounded-full bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90" href={`/portal/org/events/${slugOrId}`}>
                    Manage
                  </Link>
                  <Link className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50" href={`/portal/events/${slugOrId}`}>
                    View Public
                  </Link>
                </div>

                {/* Row actions */}
                <div className="mt-3 flex items-center justify-end gap-2">
                  <EditEventDialog event={e} />
                  <DeleteEventButton id={e.id} title={e.title} />
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <PageLink page={page - 1} disabled={page <= 1} q={q}>Previous</PageLink>
          <span className="px-3 py-1 text-sm text-gray-700">Page {page} of {totalPages}</span>
          <PageLink page={page + 1} disabled={page >= totalPages} q={q}>Next</PageLink>
        </div>
      )}
    </div>
  )
}

function PageLink({ page, q, disabled, children }: { page: number; q: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="px-3 py-2 text-sm text-gray-400 border rounded">{children}</span>
  }
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  qs.set('page', String(page))
  return (
    <Link href={`/portal/org/events?${qs.toString()}`} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">
      {children}
    </Link>
  )
}