export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import Button from '@/components/ui/Button'
import { getGatedPlayerDirectory } from '@/app/lib/community'

export const metadata = {
  title: 'Players | National Cornhole Organization',
  description: 'Member-gated player directory for the NCO community MVP.',
}

export default async function PlayersPage() {
  const result = await getGatedPlayerDirectory()

  if (result.requiresAuth) {
    return (
      <main className="bg-slate-50">
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
              Player Directory
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              This directory stays behind member auth during the MVP.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
              The current runtime does not yet have a queryable public visibility model for player
              profiles. Until that schema exists, directory access is limited to signed-in
              community members.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/portal/login?redirect=%2Fplayers">Sign in to view players</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/community">Community Overview</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
            Members Only
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Signed-in community members can browse the current player directory.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
            Public profile visibility is still staged for a later schema pass. For now, directory
            access is gated and members can manage their visibility preference in the portal.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/portal/profile">Manage My Profile</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/clubs">Browse Clubs</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {result.error ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">Directory unavailable right now.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{result.error}</p>
          </div>
        ) : result.players.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">No players available yet.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Once more members complete their profiles, they will appear here for signed-in
              community members.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {result.players.map((player) => (
              <article
                key={player.id}
                className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={player.avatarUrl || '/images/nco-mark.png'}
                    alt=""
                    className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{player.displayName}</h2>
                    <p className="text-sm text-slate-500">
                      {[player.city, player.region].filter(Boolean).join(', ') || 'Region coming soon'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Club
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {player.clubName || 'Independent player'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
