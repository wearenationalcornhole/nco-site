'use client'

import { useMemo, useState } from 'react'
import type { PlayerDirectoryItem } from '@/app/lib/communityData'

export default function PlayersDirectoryClient({ players }: { players: PlayerDirectoryItem[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return players

    return players.filter((player) => {
      return [
        player.name,
        player.displayName ?? '',
        player.city ?? '',
        player.region ?? '',
        player.clubName ?? '',
        player.favoriteBag ?? '',
        player.skillLevel ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [players, query])

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Search players
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, club, region, bag, skill level…"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No players matched that search yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((player) => (
            <article key={player.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-slate-400">
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-gray-900">{player.displayName || player.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{[player.city, player.region].filter(Boolean).join(', ') || 'Location pending'}</p>
                  {player.clubName ? <p className="mt-1 text-sm text-usaBlue">Club: {player.clubName}</p> : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {player.skillLevel ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Skill: {player.skillLevel}
                  </span>
                ) : null}
                {player.favoriteBag ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Bag: {player.favoriteBag}
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Visibility: {player.profileVisibility}
                </span>
              </div>

              {player.isOwnProfile && player.profileVisibility === 'private' ? (
                <p className="mt-4 text-xs text-amber-700">
                  This card is visible only to you because your profile is set to private.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
