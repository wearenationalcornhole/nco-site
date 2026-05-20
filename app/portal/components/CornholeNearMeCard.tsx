import Link from 'next/link'
import NearMeList, { type NearMeListItem } from '@/app/portal/components/NearMeList'
import { formatEventLocation } from '@/app/lib/eventRecords'
import { formatProfileValueLabel } from '@/app/lib/profileCapabilities'
import type { CornholeNearMeResult } from '@/app/lib/communityPulseTypes'

function toEventItems(data: CornholeNearMeResult, compact: boolean): NearMeListItem[] {
  return data.nearbyEvents.slice(0, compact ? 3 : 5).map((event) => ({
    id: event.id,
    title: event.title,
    subtitle: [formatEventLocation(event.city, event.region), event.date].filter(Boolean).join(' • '),
    href: `/portal/events/${encodeURIComponent(event.slug ?? event.id)}`,
    badge: event.matchLevel === 'city' ? 'City match' : event.matchLevel === 'region' ? 'Region match' : 'Broader',
  }))
}

function toClubItems(data: CornholeNearMeResult, compact: boolean): NearMeListItem[] {
  return data.nearbyClubs.slice(0, compact ? 3 : 5).map((club) => ({
    id: club.id,
    title: club.name,
    subtitle: [club.city, club.region].filter(Boolean).join(', ') || 'Location pending',
    href: '/clubs',
    badge: club.matchLevel === 'city' ? 'City match' : 'Region match',
  }))
}

function toPlayerItems(data: CornholeNearMeResult, compact: boolean): NearMeListItem[] {
  return data.nearbyPlayers.slice(0, compact ? 4 : 8).map((player) => ({
    id: player.id,
    title: player.name,
    subtitle: [
      [player.city, player.region].filter(Boolean).join(', '),
      player.clubName ? `Club: ${player.clubName}` : null,
      player.skillLevel ? `Level: ${formatProfileValueLabel(player.skillLevel)}` : null,
    ]
      .filter(Boolean)
      .join(' • '),
    href: player.id ? `/portal/players/${encodeURIComponent(player.id)}` : null,
    badge: player.matchLevel === 'city' ? 'City match' : 'Region match',
  }))
}

export default function CornholeNearMeCard({
  data,
  loading = false,
  compact = true,
}: {
  data: CornholeNearMeResult | null
  loading?: boolean
  compact?: boolean
}) {
  const locationLabel = data?.locationLabel ?? 'Near you'

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Cornhole Near Me</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{locationLabel}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Local events, clubs, and players based on your shared profile city and region.
          </p>
        </div>
        <Link href="/portal/community" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Full community view
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading local cornhole discovery…</p>
      ) : data?.needsLocationSetup ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <p className="text-base font-semibold text-slate-900">Add your city and state to unlock local cornhole discovery.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            We use your shared profile location to surface nearby clubs, events, and players. No GPS or map tracking in V1.
          </p>
          <Link href="/portal/profile" className="mt-4 inline-flex rounded-full bg-usaBlue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Update profile
          </Link>
        </div>
      ) : (
        <>
          {data?.discoveryNote ? <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.discoveryNote}</p> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <NearMeList title="Upcoming Events" items={data ? toEventItems(data, compact) : []} emptyMessage="No nearby events found yet." />
            <NearMeList title="Clubs Near You" items={data ? toClubItems(data, compact) : []} emptyMessage="No nearby clubs found yet." />
            <NearMeList title="Nearby Players" items={data ? toPlayerItems(data, compact) : []} emptyMessage="No nearby players found yet." />
          </div>
        </>
      )}
    </section>
  )
}
