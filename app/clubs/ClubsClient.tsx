'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { ClubDirectoryItem } from '@/app/lib/communityData'

export default function ClubsClient({
  clubs,
  currentClubId,
  isAuthenticated,
}: {
  clubs: ClubDirectoryItem[]
  currentClubId: string | null
  isAuthenticated: boolean
}) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [selectedClubId, setSelectedClubId] = useState(currentClubId)
  const [savingClubId, setSavingClubId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function setPrimaryClub(clubId: string | null) {
    setSavingClubId(clubId ?? 'none')
    setMessage(null)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/portal/login?redirect=%2Fclubs')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ primary_club_id: clubId })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSelectedClubId(clubId)
      setMessage(clubId ? 'Club affiliation updated.' : 'Club affiliation cleared.')
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update your club right now.')
    } finally {
      setSavingClubId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-600">
        {isAuthenticated ? (
          <p>
            Use the club action below to set your current club affiliation. This updates the same club field already used by
            onboarding and the player portal.
          </p>
        ) : (
          <p>
            Sign in through the portal to attach yourself to a club and show up in the member community.
          </p>
        )}
        {message ? <p className="mt-3 text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 text-red-600">{error}</p> : null}
        {selectedClubId ? (
          <button
            type="button"
            onClick={() => setPrimaryClub(null)}
            disabled={savingClubId === 'none'}
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            {savingClubId === 'none' ? 'Clearing…' : 'Clear my club'}
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {clubs.map((club) => {
          const isCurrent = selectedClubId === club.id
          const isSeedClub = club.id.startsWith('seed-club-')
          return (
            <article key={club.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-usaBlue">Club</p>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">{club.name}</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {[club.city, club.state].filter(Boolean).join(', ') || 'Region pending'}
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {club.logoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- Club logos are dynamic remote assets and may come from environment-specific storage hosts. */}
                    <img src={club.logoUrl} alt={`${club.name} logo`} className="h-full w-full object-cover" />
                    </>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">NCO</span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Affiliated players</p>
                  <p className="text-xl font-bold text-gray-900">{club.memberCount}</p>
                </div>
                {club.website ? (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Website
                  </a>
                ) : null}
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setPrimaryClub(club.id)}
                  disabled={savingClubId === club.id || isCurrent || isSeedClub}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isCurrent || isSeedClub
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-usaBlue text-white hover:opacity-90 disabled:opacity-60'
                  }`}
                >
                  {isCurrent
                    ? 'Your current club'
                    : isSeedClub
                    ? 'Preview listing'
                    : savingClubId === club.id
                    ? 'Saving…'
                    : isAuthenticated
                    ? 'Set as my club'
                    : 'Sign in to join'}
                </button>
                {isSeedClub ? (
                  <p className="mt-2 text-xs text-slate-500">
                    This card comes from fallback seed data and is not yet tied to a live club record.
                  </p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
