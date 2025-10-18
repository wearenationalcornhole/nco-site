'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type PlayerRow = { id: string; user_id: string; status?: string | null }
type SponsorLink = { id: string }
type BagRow = { id: string; status: 'Pending' | 'Approved' | 'Rejected' }

export default function InsightsPanel({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<PlayerRow[] | null>(null)
  const [sponsors, setSponsors] = useState<SponsorLink[] | null>(null)
  const [bags, setBags] = useState<BagRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    async function run() {
      try {
        const [pRes, sRes, bRes] = await Promise.all([
          fetch(`/portal/api/events/${encodeURIComponent(eventId)}/players`, { cache: 'no-store' }),
          fetch(`/portal/api/event-sponsors?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' }),
          fetch(`/portal/api/events/${encodeURIComponent(eventId)}/bags`, { cache: 'no-store' }),
        ])

        const p = pRes.ok ? await pRes.json() : []
        const s = sRes.ok ? await sRes.json() : []
        const bPayload = bRes.ok ? await bRes.json() : { rows: [] }

        if (!alive) return
        setPlayers(Array.isArray(p) ? p : [])
        setSponsors(Array.isArray(s) ? s : [])
        setBags(Array.isArray(bPayload?.rows) ? bPayload.rows : [])
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'Failed to load insights')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    run()
    return () => { alive = false }
  }, [eventId])

  const playerTotals = useMemo(() => {
    const list = players ?? []
    const total = list.length
    const byStatus = list.reduce<Record<string, number>>((acc, r) => {
      const key = (r.status ?? 'Registered').toString()
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    return { total, byStatus }
  }, [players])

  const sponsorTotal = sponsors?.length ?? 0

  const bagTotals = useMemo(() => {
    const list = bags ?? []
    const pending = list.filter(b => b.status === 'Pending').length
    const approved = list.filter(b => b.status === 'Approved').length
    const rejected = list.filter(b => b.status === 'Rejected').length
    const total = list.length
    return { total, pending, approved, rejected }
  }, [bags])

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 text-gray-600 flex items-center gap-2">
        <Spinner /> Loading insights…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-white p-6 text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Players" value={playerTotals.total} />
        <KpiCard label="Sponsors" value={sponsorTotal} />
        <KpiCard label="Bag Submissions" value={bagTotals.total} />
      </div>

      {/* Players by status */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Players by Status</h3>
          <Badge color="blue">{playerTotals.total}</Badge>
        </div>

        {playerTotals.total === 0 ? (
          <p className="mt-3 text-gray-600">No players yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(playerTotals.byStatus).map(([status, count]) => (
              <li key={status} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{status}</div>
                  <Badge color="gray">{count}</Badge>
                </div>
                <Bar percent={(count / Math.max(1, playerTotals.total)) * 100} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bag submissions breakdown */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Bag Submissions</h3>
          <Badge color="blue">{bagTotals.total}</Badge>
        </div>

        {bagTotals.total === 0 ? (
          <p className="mt-3 text-gray-600">No submissions yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <li className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Approved</div>
                <Badge color="green">{bagTotals.approved}</Badge>
              </div>
              <Bar percent={(bagTotals.approved / bagTotals.total) * 100} />
            </li>
            <li className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Pending</div>
                <Badge color="gray">{bagTotals.pending}</Badge>
              </div>
              <Bar percent={(bagTotals.pending / bagTotals.total) * 100} />
            </li>
            <li className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Rejected</div>
                <Badge color="red">{bagTotals.rejected}</Badge>
              </div>
              <Bar percent={(bagTotals.rejected / bagTotals.total) * 100} />
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  )
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="mt-3 h-2 w-full rounded bg-gray-100 overflow-hidden">
      <div
        className="h-full bg-usaBlue"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        aria-hidden
      />
    </div>
  )
}