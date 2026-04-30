// app/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import EventCard from '@/components/EventCard'
import { formatEventDate } from '@/app/lib/formatDate'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  createdAt?: string | null
}

async function getEvents(): Promise<Event[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const res = await fetch(`${base}/portal/api/events`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      return Array.isArray(json) ? json : json.events ?? []
    }
  } catch {/* fall back */}
  const local = (await import('./data/events.json')).default as Event[]
  return local.slice(0, 6)
}

export default async function Home() {
  const events = await getEvents()

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
            <Button asChild size="lg" variant="secondary">
              <Link href="/shop">Shop Bags</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/events"
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-left backdrop-blur transition hover:bg-white/20"
            >
              <p className="text-sm font-semibold">Find Events</p>
              <p className="mt-1 text-sm text-white/80">Browse upcoming tournaments and local play.</p>
            </Link>
            <Link
              href="/shop"
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-left backdrop-blur transition hover:bg-white/20"
            >
              <p className="text-sm font-semibold">Shop Bags</p>
              <p className="mt-1 text-sm text-white/80">See the current lineup of featured NCO gear.</p>
            </Link>
            <Link
              href="/portal"
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-left backdrop-blur transition hover:bg-white/20"
            >
              <p className="text-sm font-semibold">Join Community</p>
              <p className="mt-1 text-sm text-white/80">Create a profile and keep up with your events.</p>
            </Link>
            <Link
              href="/portal/login?redirect=%2Fportal%2Forg"
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-left backdrop-blur transition hover:bg-white/20"
            >
              <p className="text-sm font-semibold">Organize Events</p>
              <p className="mt-1 text-sm text-white/80">Access organizer tools for schedules, sponsors, and players.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F4D35E]">
                  Public Site Foundation
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  One front door for players, clubs, and organizers.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                  Explore public events, browse shop inventory, join the community portal, or
                  move directly into organizer workflows from the main site.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild>
                  <Link href="/events">Find Events</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/shop">Shop Bags</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/portal">Join Community</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/portal/login?redirect=%2Fportal%2Forg">Organize Events</Link>
                </Button>
              </div>
            </div>
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
