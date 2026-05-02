import Link from 'next/link'
import PlayersDirectoryClient from '@/app/players/PlayersDirectoryClient'
import { getCurrentViewer, listCommunityPlayers } from '@/app/lib/communityData'

export default async function PlayersPage() {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Players</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            The player directory is available to signed-in members.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            That keeps community information inside the member portal while clubs and events remain public.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/portal/login?redirect=%2Fplayers" className="rounded-full bg-usaBlue px-5 py-3 text-sm font-medium text-white">
              Sign in to view players
            </Link>
            <Link href="/community" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700">
              Back to community
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const players = await listCommunityPlayers(viewer.id)

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Players</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Member directory for the NCO player base.
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Profiles marked public or members-only appear here. Private profiles stay hidden from everyone except their owner.
          </p>
        </div>

        <div className="mt-8">
          <PlayersDirectoryClient players={players} />
        </div>
      </section>
    </main>
  )
}
