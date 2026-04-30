import Link from 'next/link'

export const metadata = {
  title: 'About | National Cornhole Organization',
  description: 'Learn about the National Cornhole Organization and the community it serves.',
}

export default function AboutPage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
            About NCO
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Built to connect local players, clubs, and tournament organizers.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            National Cornhole Organization is focused on making it easier to discover events,
            grow local competition, and give organizers a better foundation for running quality
            tournaments.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl bg-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900">For Players</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Find upcoming tournaments, local clubs, and community touchpoints without
                bouncing between disconnected pages.
              </p>
            </article>
            <article className="rounded-2xl bg-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900">For Organizers</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Manage event details, registrations, sponsors, and branded assets through one
                connected workflow.
              </p>
            </article>
            <article className="rounded-2xl bg-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900">For Clubs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Build stronger local communities and create clear entry points for new players to
                join the game.
              </p>
            </article>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Find Events
            </Link>
            <Link
              href="/portal"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Join Community
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
