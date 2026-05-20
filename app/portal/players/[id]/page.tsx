export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { redirect } from 'next/navigation'
import ActivityFeedList from '@/app/portal/components/ActivityFeedList'
import { formatEventDate } from '@/app/lib/publicEvents'
import { formatProfileValueLabel } from '@/app/lib/profileCapabilities'
import { loadPlayerProfileDetail } from '@/app/lib/playerProfileDetail'
import { getRouteActor } from '@/app/lib/portalRouteAccess'

function formatMemberSince(value: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatLocation(city: string | null, region: string | null, country: string | null) {
  const primary = [city, region].filter(Boolean).join(', ')
  if (primary) return primary
  return country ?? 'Location pending'
}

function roleLabel(role: string | null) {
  if (role === 'organizer') return 'Organizer'
  if (role === 'admin') return 'Admin'
  return null
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const actor = await getRouteActor()

  if (!actor.user) {
    redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/players/${id}`)}`)
  }

  const detail = await loadPlayerProfileDetail({
    profileId: id,
    viewer: {
      userId: actor.user.id,
      role: actor.role,
      isAuthenticated: true,
    },
  })

  if (detail.status === 'not_found') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Players</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Player not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We couldn&apos;t find that player profile.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/players" className="rounded-full bg-usaBlue px-4 py-2 text-sm font-medium text-white">
              Back to Players
            </Link>
            <Link href="/portal/community" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Back to Community
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (detail.status === 'forbidden') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Players</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">This player profile is private.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This profile is only visible to the player and admins.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/players" className="rounded-full bg-usaBlue px-4 py-2 text-sm font-medium text-white">
              Back to Players
            </Link>
            <Link href="/portal/community" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Back to Community
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (detail.status !== 'ok') {
    return null
  }

  const { profile, recentActivity, upcomingEvents, viewer } = detail
  const identityFields = [
    profile.skill_level,
    profile.favorite_bag_style,
    profile.dominant_hand,
    profile.home_venue,
    profile.bio,
  ].filter(Boolean)
  const location = formatLocation(profile.city, profile.region, profile.country)
  const profileRoleLabel = roleLabel(profile.role)

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-slate-400">{profile.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Player</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{profile.name}</h1>
                {profileRoleLabel ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {profileRoleLabel}
                  </span>
                ) : null}
                {profile.profile_visibility ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Visibility: {profile.profile_visibility}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">{location}</p>
              {profile.club_name ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  {profile.club_logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.club_logo_url} alt="" className="h-5 w-5 rounded-full border border-slate-200 object-cover" />
                  ) : null}
                  <span>Club: <strong>{profile.club_name}</strong></span>
                </div>
              ) : null}
              <p className="mt-2 text-sm text-slate-500">Member since {formatMemberSince(profile.created_at)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/players" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Back to Players
            </Link>
            <Link href="/portal/community" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Back to Community
            </Link>
            {viewer.isSelf ? (
              <>
                <Link href="/portal/players" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  My Player Hub
                </Link>
                <Link href="/portal/profile" className="rounded-full bg-usaBlue px-4 py-2 text-sm font-medium text-white">
                  Edit Profile
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Player Identity</p>
        {identityFields.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            This player has not filled out their player identity yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bio</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {profile.bio?.trim() || 'This player has not filled out their player identity yet.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <IdentityCard label="Skill Level" value={profile.skill_level} />
              <IdentityCard label="Favorite Bag" value={profile.favorite_bag_style} />
              <IdentityCard label="Dominant Hand" value={profile.dominant_hand} />
              <IdentityCard label="Home Venue" value={profile.home_venue} raw />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Upcoming Events</p>
        {upcomingEvents.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            No upcoming registered events found.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {upcomingEvents.map((event: typeof upcomingEvents[number]) => (
              <Link
                key={event.id}
                href={`/portal/events/${encodeURIComponent(event.slug ?? event.id)}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-usaBlue/30 hover:bg-white"
              >
                <h2 className="text-base font-semibold text-slate-900">{event.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{event.locationLabel}</p>
                <p className="mt-1 text-sm text-slate-600">{formatEventDate(event.date)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Recent Activity</p>
        <div className="mt-5">
          <ActivityFeedList items={recentActivity} emptyMessage="No recent activity yet." />
        </div>
      </section>
    </main>
  )
}

function IdentityCard({
  label,
  value,
  raw = false,
}: {
  label: string
  value: string | null
  raw?: boolean
}) {
  const displayValue = raw ? value?.trim() || 'Not set yet' : formatProfileValueLabel(value)

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{displayValue}</p>
    </div>
  )
}
