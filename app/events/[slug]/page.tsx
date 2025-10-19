// app/events/[slug]/page.tsx
import Link from 'next/link'
import RegisterButton from '@/app/components/RegisterButton'
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

type SponsorLink = {
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

async function baseUrl() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('host') ?? process.env.VERCEL_URL ?? 'localhost:3000'
  return `${proto}://${host}`
}

async function getEventBySlug(slug: string): Promise<Event | null> {
  const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function getSponsors(eventId: string): Promise<SponsorLink[]> {
  const res = await fetch(`/portal/api/event-sponsors?eventId=${encodeURIComponent(eventId)}`, {
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="mt-2 text-gray-600">We couldn’t find that event. It may have been moved or removed.</p>
        <div className="mt-6">
          <Link href="/events" className="rounded border px-4 py-2 hover:bg-gray-50">
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
      <section className="relative isolate overflow-hidden bg-usaBlue/75 text-white">
        <img
          src={event.image ?? '/images/hero-cornhole.webp'}
          alt={event.title}
          className="absolute inset-0 -z-10 h-full w-full object-cover mix-blend-multiply opacity-80"
          loading="eager"
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <p className="uppercase tracking-widest text-white/80 text-xs sm:text-sm">National Cornhole Organization</p>
          <h1 className="mt-2 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight">
            {event.title}
          </h1>
          <p className="mt-3 text-white/90">
            {event.city ?? 'TBD'} • {fmtDate(event.date)}
          </p>
          <div className="mt-6">
            <RegisterButton eventId={event.id} />
          </div>
        </div>
      </section>

      {/* Details */}
      <main className="py-10 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <h2 className="text-xl font-semibold">About this Event</h2>
            <p className="mt-3 text-gray-700">
              Get ready to throw! Register now to secure your spot. Check back for divisions, prize pools, and schedule.
            </p>

            {event.image && (
              <div className="mt-6 overflow-hidden rounded-2xl">
                <img
                  src={event.image}
                  alt=""
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </article>

          <aside className="lg:col-span-1">
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-700">Event Info</h3>
              <dl className="mt-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-gray-500">Date</dt>
                  <dd className="font-medium">{fmtDate(event.date)}</dd>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-gray-500">City</dt>
                  <dd className="font-medium">{event.city ?? 'TBD'}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Slug</dt>
                  <dd className="font-medium">{event.slug ?? event.id}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <RegisterButton eventId={event.id} />
              </div>
            </div>
          </aside>
        </div>

        {/* Sponsors strip (kept) */}
        {sponsors.length > 0 && (
          <section className="mt-12 border-t">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider text-center">
                Sponsors
              </h2>
              <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
                {sponsors.map((link) => {
                  const c = link.sponsor_companies
                  return (
                    <li key={link.id} className="flex items-center justify-center">
                      {c?.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={c.name}
                          className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{c?.name ?? 'Sponsor'}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}