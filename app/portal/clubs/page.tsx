import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getRouteActor, listManagedClubs } from '@/app/lib/portalRouteAccess'
import { canUseAdminTools } from '@/app/lib/profileCapabilities'

export default async function PortalClubsPage() {
  const actor = await getRouteActor()

  if (!actor.user) {
    redirect('/portal/login?redirect=/portal/clubs')
  }

  const managedClubs = await listManagedClubs(actor)
  const isAdmin = canUseAdminTools(actor.role)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Club Management</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Club-scoped access stays separate from event organizer tools.</h1>
        <p className="mt-3 text-gray-600">
          Your profile remains the shared identity. Organizer role controls event tools, while club owner and manager access
          comes from `club_memberships`. `primary_club_id` remains affiliation only.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border bg-white p-6">
        {managedClubs.length === 0 ? (
          <div className="space-y-3">
            <p className="text-gray-700">
              {isAdmin
                ? 'No clubs were returned from the club membership helper yet.'
                : 'You do not currently have owner or manager access to any clubs.'}
            </p>
            <p className="text-sm text-gray-500">
              Club assignment UI is still pending. Admins can seed `club_memberships` directly and use the new membership API
              routes in the meantime.
            </p>
            <div className="flex gap-3">
              <Link href="/clubs" className="rounded bg-usaBlue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Open club directory
              </Link>
              <Link
                href="/portal/profile"
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open shared profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Clubs below are manageable through scoped membership. This is intentionally separate from the event organizer
              console.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {managedClubs.map((entry) => (
                <article key={entry.clubId} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Managed club</p>
                      <h2 className="mt-1 text-xl font-semibold text-gray-900">{entry.club.name}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {[entry.club.city, entry.club.state].filter(Boolean).join(', ') || 'Location pending'}
                      </p>
                    </div>
                    <span className="rounded-full bg-usaBlue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-usaBlue">
                      {entry.role}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Link
                      href="/clubs"
                      className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                      View club directory
                    </Link>
                    <Link
                      href={`/portal/api/clubs/${entry.clubId}/memberships`}
                      className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Membership API
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
