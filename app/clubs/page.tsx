import Link from 'next/link'
import Button from '@/components/ui/Button'
import { getPublicClubs } from '@/app/lib/community'

export const metadata = {
  title: 'Clubs | National Cornhole Organization',
  description: 'Browse public club listings in the NCO community MVP.',
}

export default async function ClubsPage() {
  const clubs = await getPublicClubs()

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
            Clubs
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Local club pages are now part of the public NCO surface.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            This MVP focuses on discoverability first: public cards, location, website, and a
            clear path into the member portal while club follow and join requests wait for schema
            support.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/community">Community Overview</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/portal/login?redirect=%2Fportal%2Fprofile">Join the Portal</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {clubs.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">No clubs published yet.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Club listings will appear here as public community pages continue to expand.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map((club) => (
              <article
                key={club.id}
                className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <InitialBadge name={club.name} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Join tools planned
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
                  {club.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {club.city && club.state ? `${club.city}, ${club.state}` : 'Location to be announced'}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Public visibility is live now. Follow and join requests are deferred until the
                  member-intent tables and policies are added to the database.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {club.website ? (
                    <a
                      href={club.website}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Visit Website
                    </a>
                  ) : null}
                  <Link
                    href="/portal/login?redirect=%2Fportal%2Fprofile"
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    Join Community
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function InitialBadge({ name }: { name: string }) {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#B31942] text-lg font-black text-white">
      {name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)}
    </div>
  )
}
