import ClubsClient from '@/app/clubs/ClubsClient'
import { getCurrentViewer, getCurrentViewerClubId, listCommunityClubs } from '@/app/lib/communityData'

export default async function ClubsPage() {
  const [clubs, viewer, currentClubId] = await Promise.all([
    listCommunityClubs(),
    getCurrentViewer(),
    getCurrentViewerClubId(),
  ])

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Clubs</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Club cards for the growing NCO network.
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Clubs are public-facing so players can discover where to play, while actual player-directory access stays inside
            the signed-in community.
          </p>
        </div>

        <div className="mt-10">
          <ClubsClient clubs={clubs} currentClubId={currentClubId} isAuthenticated={Boolean(viewer)} />
        </div>
      </section>
    </main>
  )
}
