// app/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import EventCard from '@/components/EventCard'

// Types
type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  createdAt?: string | null
}

// Try API first; fall back to local JSON if needed
async function getEvents(): Promise<Event[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/portal/api/events`, {
      cache: 'no-store',
      // If NEXT_PUBLIC_BASE_URL is empty, allow relative fetch during runtime
      // (Next will resolve it server-side). If that throws, we catch below.
    })
    if (res.ok) {
      const json = await res.json()
      return Array.isArray(json) ? json : json.events ?? []
    }
  } catch {
    // ignore and fall back
  }

  // Local JSON fallback (lightweight featured list)
  const local = (await import('./data/events.json')).default as Event[]
  return local.slice(0, 6)
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

export default async function Home() {
  const events = await getEvents()

  return (
    <main className="min-h-screen">
      {/* ── HERO (NCO Blue + PNG Logo) ───────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* Background image (subtle), then NCO blue overlay */}
        <div className="absolute inset-0 -z-10">
          <img
            src="/images/hero-cornhole.webp"
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-usaBlue/85" />
          {/* top-to-bottom brand gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand/40 via-brand/50 to-brand/60" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-white">
          {/* Logo (PNG) */}
          <div className="flex justify-center">
            <Image
              src="/images/nco-mark.png"
              alt="National Cornhole Organization"
              width={96}
              height={96}
              priority
              className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-md"
            />
          </div>

          <h1 className="mt-6 text-center text-4xl sm:text-5xl font-extrabold tracking-tight">
            Bringing Local Cornhole Together
          </h1>
          <p className="mt-3 text-center text-white/90 max-w-2xl mx-auto">
            Discover tournaments, leagues, and places to play—built for regular players,
            organizers, and clubs across the country.
          </p>

          {/* CTAs — use Button asChild so it's a proper <a> */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/events">Find Events</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 backdrop-blur hover:bg-white/20">
              <Link href="/portal">Organizer Portal</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FEATURES (quick value props) ─────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border p-5">
            <div className="text-sm font-semibold text-usaBlue">For Players</div>
            <p className="mt-1 text-gray-700">
              Find local tournaments and leagues. Track where you’ve played.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <div className="text-sm font-semibold text-usaBlue">For Organizers</div>
            <p className="mt-1 text-gray-700">
              Manage events, sponsors, divisions, and registrations—fast.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <div className="text-sm font-semibold text-usaBlue">For Clubs</div>
            <p className="mt-1 text-gray-700">
              Build your community, run nights, and grow the local game.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURED EVENTS ──────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Featured Events</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/events">Browse All</Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <p className="mt-6 text-gray-600">No events yet—check back soon.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((e) => (
                <EventCard
                  key={e.id}
                  title={e.title}
                  city={e.city ?? 'TBD'}
                  date={fmtDate(e.date)}
                  image={e.image ?? '/images/tournament-1.webp'}
                  href={`/portal/events/${e.slug ?? e.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}