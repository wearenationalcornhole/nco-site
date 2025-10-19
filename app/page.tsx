// app/page.tsx
import Link from 'next/link'

function currentMonthParam() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function HomePage() {
  const month = currentMonthParam()

  return (
    <main>
      {/* Hero – brighter, forced white text, no blend modes */}
      <section className="relative isolate overflow-hidden">
        {/* Image + overlays */}
        <div className="absolute inset-0 -z-10">
          <img
            src="/images/hero-cornhole.webp"
            alt="Cornhole"
            className="h-full w-full object-cover"
            loading="eager"
          />
          {/* Flat blue tint */}
          <div className="absolute inset-0 bg-usaBlue/40" />
          {/* Depth gradient so top text pops and bottom stays rich */}
          <div className="absolute inset-0 bg-gradient-to-b from-usaBlue/30 via-usaBlue/50 to-usaBlue/70" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-white">
          <p className="uppercase tracking-widest text-white/85 text-xs sm:text-sm">
            National Cornhole Organization
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Bringing Local Cornhole Together
          </h1>
          <p className="mt-3 max-w-2xl text-white/90">
            Discover nearby tournaments and leagues, or organize your own — built for local
            communities, not just the pros.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href={`/events?month=${month}`}
              className="inline-flex items-center rounded bg-white px-5 py-2.5 text-usaBlue text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Find Events
            </Link>
            <Link
              href="/portal"
              className="inline-flex items-center rounded border border-white/70 px-5 py-2.5 text-white text-sm font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Open Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Features (unchanged) */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border p-6">
            <h3 className="font-semibold">For Players</h3>
            <p className="mt-2 text-sm text-gray-600">
              Search local tournaments and leagues, register in seconds, track your history.
            </p>
          </div>
          <div className="rounded-xl border p-6">
            <h3 className="font-semibold">For Organizers</h3>
            <p className="mt-2 text-sm text-gray-600">
              Manage events, sponsors, and players — fast tools built for the real world.
            </p>
          </div>
          <div className="rounded-xl border p-6">
            <h3 className="font-semibold">Sponsors</h3>
            <p className="mt-2 text-sm text-gray-600">
              Showcase brands at the local level where community engagement is strongest.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}