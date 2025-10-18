'use client'

import { useEffect, useState } from 'react'
import Spinner from '@/components/ui/Spinner'

type OrgProfile = {
  user: { id: string; name?: string | null; email: string }
  club?: { id: string; name: string } | null
}

export default function Client() {
  const [data, setData] = useState<OrgProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/portal/api/org/profile', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load organizer profile')
        const json = (await res.json()) as OrgProfile
        if (!alive) return
        setData(json)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'Error loading profile')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Spinner /> Loading profile…
      </div>
    )
  }

  if (error || !data) {
    return <div className="text-red-600">Failed to load profile. {error ?? ''}</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Organizer</h2>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium">{data.user.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium">{data.user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Club</h2>
        {data.club ? (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Club Name</dt>
              <dd className="font-medium">{data.club.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Club ID</dt>
              <dd className="font-medium">{data.club.id}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-gray-600">No club connected yet.</p>
        )}
      </section>
    </div>
  )
}