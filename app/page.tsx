// app/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import EventCard from '@/components/EventCard'
import { fetchPublicEvents, formatEventDate } from '@/app/lib/publicEvents'

export default async function Home() {
  const events = await fetchPublicEvents()

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="/images/hero-cornhole.webp"
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-usaBlue/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand/30 via-brand/40 to-brand/50" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-white">
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

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/events">Find Events</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 backdrop-blur hover:bg-white/20">
              <Link href="/community">Join Community</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link href="/events" className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">Find Events</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">See upcoming tournaments</h2>
              <p className="mt-2 text-sm text-gray-600">Browse public event listings, dates, and locations.</p>
            </Link>
            <Link href="/shop" className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">Shop Bags</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Explore tournament gear</h2>
              <p className="mt-2 text-sm text-gray-600">View current product drops and signature bags.</p>
            </Link>
            <Link href="/community" className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">Join Community</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Discover clubs and member tools</h2>
              <p className="mt-2 text-sm text-gray-600">Start at the community hub, then sign in to unlock the player directory and profile tools.</p>
            </Link>
            <Link href="/portal/login?redirect=%2Fportal%2Forg" className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">Organize Events</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Run leagues and tournaments</h2>
              <p className="mt-2 text-sm text-gray-600">Access the organizer console to manage events and registrations.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-usaBlue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border p-5">
            <div className="text-sm font-semibold text-white">For Players</div>
            <p className="mt-1 text-white/80">
              Find local tournaments and leagues. Track where you’ve played.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <div className="text-sm font-semibold text-white">For Organizers</div>
            <p className="mt-1 text-white/80">
              Manage events, sponsors, divisions, and registrations—fast.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <div className="text-sm font-semibold text-white">For Clubs</div>
            <p className="mt-1 text-white/80">
              Build your community, run nights, and grow the local game.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED EVENTS */}
      <section className="bg-usaBlue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Featured Events</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/events">Browse All</Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <p className="mt-6 text-white/80">No events yet—check back soon.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((e) => (
                <EventCard
                  key={e.id}
                  title={e.title}
                  subtitle={`${e.city ?? 'TBD'} • ${formatEventDate(e.date)}`}
                  image={e.image ?? '/images/tournament-1.webp'}
                  href={`/events/${e.slug ?? e.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
