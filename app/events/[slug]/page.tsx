// app/events/[slug]/page.tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  createdAt?: string
}

type SponsorLink = {
  id: string
  event_id: string
  company_id: string
  company?: {
    id: string
    name: string
    website?: string | null
    logo?: string | null      // dev fallback
    logo_url?: string | null  // DB field
  } | null
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

async function getEvent(slug: string): Promise<Event | null> {
  try {
    const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as Event
  } catch {
    return null
  }
}

async function getSponsors(eventId: string): Promise<SponsorLink[]> {
  try {
    const res = await fetch(`/portal/api/event-sponsors?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
    if (!res.ok) return []
    return (await res.json()) as SponsorLink[]
  } catch {
    return []
  }
}

export default async function Page({
  params,
}: {
  // Keep promise-based params to match your Next 15 setup
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEvent(slug)

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="mt-2 text-gray-600">We couldn’t find an event for “{slug}”.</p>
        <div className="mt-6">
          <Link href="/events" className="inline-flex items-center rounded bg-usaBlue px-4 py-2 text-white hover:opacity-90">
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const sponsors = await getSponsors(event.id)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        {event.image ? (
          <>
            <img
              src={event.image}
              alt={event.title}
              className="absolute inset-0 -z-10 h-full w-full object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-black/60" />
          </>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <p className="uppercase tracking-widest text-white/80 text-xs sm:text-sm">National Cornhole Organization</p>
          <h1 className="mt-2 max-w-3xl text-balance text-3xl sm:text-4xl lg:text-5xl font-extrabold">{event.title}</h1>
          <p className="mt-3 text-white/90">{event.city ?? 'TBD'} &middot; {fmtDate(event.date)}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/portal/register/${event.slug ?? event.id}`}
              className="inline-flex items-center justify-center rounded-full bg-usaRed px-6 py-3 font-semibold text-white hover:bg-[#8F1732]"
            >
              Register
            </a>
            <a
              href="/events"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 font-semibold text-white/90 hover:bg-white/10"
            >
              All Events
            </a>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold">About this Event</h2>
              <p className="mt-3 text-gray-700">
                {/* Placeholder text — replace with CMS content later */}
                Join us for a friendly, competitive day of cornhole. Meet local players, enjoy the community vibe,
                and compete for bragging rights.
              </p>
            </div>

            <aside className="rounded-xl border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-700">Event Info</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date</dt>
                  <dd className="font-medium">{fmtDate(event.date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">City</dt>
                  <dd className="font-medium">{event.city ?? 'TBD'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Event ID</dt>
                  <dd className="font-mono text-xs text-gray-700">{event.id}</dd>
                </div>
              </dl>
            </aside>
          </div>

          {/* Sponsors — horizontal strip */}
          {(sponsors?.length ?? 0) > 0 && (
            <section className="mt-12 border-t pt-8">
              <h3 className="text-base font-semibold text-gray-700">Event Sponsors</h3>

              {/* Scrollable row with subtle mask edges */}
              <div
                className="relative mt-4 sponsor-scroll"
                aria-label="Sponsor logos"
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />

                <ul className="no-scrollbar flex items-center gap-8 overflow-x-auto py-2">
                  {sponsors.map((s) => {
                    const name = s.company?.name ?? 'Sponsor'
                    const logo = (s.company?.logo_url ?? s.company?.logo) || null
                    const href = s.company?.website ?? undefined

                    const content = logo ? (
                      <img
                        src={logo}
                        alt={name}
                        loading="lazy"
                        className="h-12 w-auto max-w-none object-contain grayscale hover:grayscale-0 transition"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">{name}</span>
                    )

                    return (
                      <li key={s.id} className="shrink-0">
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                            {content}
                          </a>
                        ) : (
                          content
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}