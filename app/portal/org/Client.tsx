'use client'

import Link from 'next/link'

export default function Client() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage your events, sponsors, bags, and players.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashCard
          title="Events"
          desc="Create and manage events"
          href="/portal/org/events"
        />
        <DashCard
          title="Sponsors"
          desc="Browse sponsor directory"
          href="/portal/org/sponsors" // create later
          comingSoon
        />
        <DashCard
          title="Players"
          desc="View registrations & rosters"
          href="/portal/org/players" // create later
          comingSoon
        />
        <DashCard
          title="Settings"
          desc="Organization profile & preferences"
          href="/portal/org/settings" // create later
          comingSoon
        />
      </div>
    </div>
  )
}

function DashCard({
  title,
  desc,
  href,
  comingSoon = false,
}: {
  title: string
  desc: string
  href: string
  comingSoon?: boolean
}) {
  const inner = (
    <div className="h-full rounded-xl border bg-white p-5 hover:shadow transition">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {comingSoon && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            Soon
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
      {!comingSoon && (
        <div className="mt-4 text-sm text-usaBlue">Open →</div>
      )}
    </div>
  )

  return comingSoon ? (
    <div className="opacity-70 cursor-not-allowed">{inner}</div>
  ) : (
    <Link href={href}>{inner}</Link>
  )
}