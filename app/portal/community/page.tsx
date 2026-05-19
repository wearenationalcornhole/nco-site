export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { redirect } from 'next/navigation'
import ActivityFeedList from '@/app/portal/components/ActivityFeedList'
import CornholeNearMeCard from '@/app/portal/components/CornholeNearMeCard'
import { listCommunityActivity } from '@/app/lib/activityFeed'
import { getCornholeNearMe } from '@/app/lib/cornholeNearMe'
import { canUseOrganizerTools } from '@/app/lib/profileCapabilities'
import { getRouteActor } from '@/app/lib/portalRouteAccess'

export default async function PortalCommunityPage() {
  const actor = await getRouteActor()

  if (!actor.user) {
    redirect('/portal/login?redirect=%2Fportal%2Fcommunity')
  }

  const [communityPulse, nearMe] = await Promise.all([
    listCommunityActivity(
      {
        profileId: actor.user.id,
        role: actor.role,
        isAuthenticated: true,
      },
      20,
    ),
    getCornholeNearMe({ currentProfileId: actor.user.id }),
  ])

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Community</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">See what&apos;s happening across NCO and near your local cornhole scene.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          Community Pulse keeps the portal feeling alive with system-generated activity, while Cornhole Near Me highlights
          local events, clubs, and players based on your shared profile location.
        </p>
      </section>

      <CornholeNearMeCard data={nearMe} compact={false} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Community Pulse</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Recent activity across the NCO network.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              V1 is intentionally simple: recent system-generated updates only. No comments, likes, DMs, or moderation-heavy social features.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ActivityFeedList
            items={communityPulse}
            emptyMessage="No community activity yet. The boards are quiet. Suspicious."
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Quick Actions</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            href="/portal/events"
            title="Find events"
            body="Browse upcoming tournaments and jump back into registration flows."
          />
          <QuickAction
            href="/portal/profile"
            title="Update profile"
            body="Keep your city and region current so local discovery stays useful."
          />
          <QuickAction
            href="/players"
            title="View player page"
            body="Open the member player directory and see who is active around the network."
          />
          {canUseOrganizerTools(actor.role) ? (
            <QuickAction
              href="/portal/bag-maker"
              title="Bag Maker"
              body="Create custom organizer bag art and generate new proofs."
            />
          ) : null}
        </div>
      </section>
    </main>
  )
}

function QuickAction({
  href,
  title,
  body,
}: {
  href: string
  title: string
  body: string
}) {
  return (
    <Link href={href} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-usaBlue/30 hover:bg-white hover:shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <span className="mt-5 inline-flex rounded-full bg-usaBlue px-4 py-2 text-sm font-medium text-white">Open</span>
    </Link>
  )
}
