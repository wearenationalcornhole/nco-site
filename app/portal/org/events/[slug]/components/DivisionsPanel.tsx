'use client'

import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type Division = {
  id: string
  event_id: string
  name: string
  cap: number | null
  created_at?: string | null
}

type Assignment = {
  id: string
  eventId: string
  divisionId: string
  userId: string
  status: 'assigned' | 'waitlisted'
  createdAt: string | null
  user?: { id: string; name?: string | null; email?: string | null } | null
}

type Registration = {
  id?: string
  eventId: string
  userId: string
  createdAt?: string
  user?: { id: string; email?: string | null; name?: string | null } | null
}

export default function DivisionsPanel({
  eventId,
  onToast,
}: {
  eventId: string
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [divisions, setDivisions] = useState<Division[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, { assigned: number; waitlisted: number }>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [emailByDiv, setEmailByDiv] = useState<Record<string, string>>({})

  // Fetch divisions + initial counts
  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      try {
        const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load divisions')
        const payload = await res.json()
        const divs: Division[] = Array.isArray(payload?.divisions)
          ? payload.divisions
          : Array.isArray(payload)
          ? payload
          : []
        if (!alive) return
        setDivisions(divs)

        const pairs = await Promise.all(
          divs.map(async (d) => {
            const r = await fetch(
              `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(d.id)}/assignments`,
              { cache: 'no-store' }
            )
            if (!r.ok) return [d.id, { assigned: 0, waitlisted: 0 }] as const
            const rows = (await r.json()) as Assignment[]
            const assigned = rows.filter((a) => a.status === 'assigned').length
            const waitlisted = rows.length - assigned
            return [d.id, { assigned, waitlisted }] as const
          })
        )
        const nextCounts: Record<string, { assigned: number; waitlisted: number }> = {}
        for (const [id, c] of pairs) nextCounts[id] = c
        setCounts(nextCounts)
      } catch (e: any) {
        console.error(e)
        if (!alive) return
        setDivisions([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [eventId])

  function fmtCap(cap: number | null | undefined) {
    return cap == null ? '∞' : String(cap)
  }

  async function loadAssignments(divisionId: string) {
    const r = await fetch(
      `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(divisionId)}/assignments`,
      { cache: 'no-store' }
    )
    if (!r.ok) throw new Error('Failed to load assignments')
    const rows = (await r.json()) as Assignment[]
    setAssignments((prev) => ({ ...prev, [divisionId]: rows }))
    const assigned = rows.filter((a) => a.status === 'assigned').length
    const waitlisted = rows.length - assigned
    setCounts((prev) => ({ ...prev, [divisionId]: { assigned, waitlisted } }))
  }

  async function toggleDivision(d: Division) {
    const next = !open[d.id]
    setOpen((prev) => ({ ...prev, [d.id]: next }))
    if (next && !assignments[d.id]) {
      try {
        setBusy(`load-${d.id}`)
        await loadAssignments(d.id)
      } catch (e: any) {
        onToast({ msg: e?.message ?? 'Failed to load assignments', kind: 'error' })
      } finally {
        setBusy(null)
      }
    }
  }

  async function setCap(d: Division) {
    const v = prompt('Set cap (leave blank for no limit)', d.cap == null ? '' : String(d.cap))
    if (v === null) return
    const cap = v.trim() === '' ? null : Number(v)
    if (cap !== null && Number.isNaN(cap)) {
      onToast({ msg: 'Invalid cap', kind: 'error' })
      return
    }
    try {
      setBusy(`cap-${d.id}`)
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(d.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cap }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update cap')
      const updated: Division = await res.json()
      setDivisions((prev) => prev?.map((x) => (x.id === d.id ? updated : x)) ?? [])
      onToast({ msg: 'Cap updated', kind: 'success' })
      await loadAssignments(d.id)
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Update failed', kind: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function autoAssign(d: Division) {
    try {
      setBusy(`auto-${d.id}`)
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(d.id)}/assignments`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'No available registrations')
      const created = (await res.json()) as Assignment
      setAssignments((prev) => {
        const list = prev[d.id] ?? []
        return { ...prev, [d.id]: [created, ...list] }
      })
      const deltaAssigned = created.status === 'assigned' ? 1 : 0
      const deltaWait = created.status === 'waitlisted' ? 1 : 0
      setCounts((prev) => {
        const c = prev[d.id] ?? { assigned: 0, waitlisted: 0 }
        return { ...prev, [d.id]: { assigned: c.assigned + deltaAssigned, waitlisted: c.waitlisted + deltaWait } }
      })
      onToast({
        msg: created.status === 'assigned' ? 'Assigned next player' : 'Division full — added to waitlist',
        kind: 'success',
      })
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Auto-assign failed', kind: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function assignByEmail(d: Division) {
    const email = (emailByDiv[d.id] ?? '').trim()
    if (!email) {
      onToast({ msg: 'Enter an email first', kind: 'error' })
      return
    }

    try {
      setBusy(`email-${d.id}`)

      // ensure registration
      const regRes = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!regRes.ok) throw new Error((await regRes.json())?.error ?? 'Failed to register player')
      const reg = (await regRes.json()) as Registration
      const userId = reg.userId

      // assign
      const aRes = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(d.id)}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      )
      if (!aRes.ok) throw new Error((await aRes.json())?.error ?? 'Failed to assign')
      const created = (await aRes.json()) as Assignment

      setAssignments((prev) => {
        const list = prev[d.id] ?? []
        return { ...prev, [d.id]: [created, ...list] }
      })
      const deltaAssigned = created.status === 'assigned' ? 1 : 0
      const deltaWait = created.status === 'waitlisted' ? 1 : 0
      setCounts((prev) => {
        const c = prev[d.id] ?? { assigned: 0, waitlisted: 0 }
        return { ...prev, [d.id]: { assigned: c.assigned + deltaAssigned, waitlisted: c.waitlisted + deltaWait } }
      })

      setEmailByDiv((prev) => ({ ...prev, [d.id]: '' }))
      onToast({
        msg: created.status === 'assigned' ? 'Player assigned' : 'Division full — added to waitlist',
        kind: 'success',
      })
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Assign failed', kind: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function removeAssignment(d: Division, a: Assignment) {
    const ok = confirm(`Remove ${a.user?.name || a.user?.email || a.userId} from ${d.name}?`)
    if (!ok) return
    try {
      setBusy(`rem-${a.id}`)
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(d.id)}/assignments?assignmentId=${encodeURIComponent(
          a.id
        )}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to remove')
      setAssignments((prev) => {
        const list = (prev[d.id] ?? []).filter((x) => x.id !== a.id)
        return { ...prev, [d.id]: list }
      })
      setCounts((prev) => {
        const c = prev[d.id] ?? { assigned: 0, waitlisted: 0 }
        return {
          ...prev,
          [d.id]: {
            assigned: c.assigned - (a.status === 'assigned' ? 1 : 0),
            waitlisted: c.waitlisted - (a.status === 'waitlisted' ? 1 : 0),
          },
        }
      })
      onToast({ msg: 'Removed', kind: 'success' })
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Remove failed', kind: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const isBusy = (key: string) => busy === key

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Divisions</h2>
          <Badge color="blue">{divisions?.length ?? 0}</Badge>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-gray-600 flex items-center gap-2">
          <Spinner /> Loading…
        </div>
      ) : (divisions ?? []).length === 0 ? (
        <div className="mt-4 text-gray-600">No divisions yet.</div>
      ) : (
        <ul className="mt-4 space-y-3">
          {divisions!.map((d) => {
            const c = counts[d.id] ?? { assigned: 0, waitlisted: 0 }
            const capTxt = fmtCap(d.cap)
            const full = d.cap != null && c.assigned >= d.cap
            return (
              <li key={d.id} className="border rounded-lg">
                {/* header row */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDivision(d)}
                      className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                      aria-expanded={!!open[d.id]}
                    >
                      {open[d.id] ? 'Hide' : 'Show'}
                    </button>
                    <div className="font-medium">{d.name}</div>
                    <Badge color={full ? 'red' : 'green'}>
                      {c.assigned}/{capTxt}
                    </Badge>
                    {c.waitlisted > 0 && <Badge color="gray">WL {c.waitlisted}</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isBusy(`cap-${d.id}`)}
                      onClick={() => setCap(d)}
                    >
                      Edit Cap
                    </Button>
                    <Button
                      size="sm"
                      loading={isBusy(`auto-${d.id}`)}
                      onClick={() => autoAssign(d)}
                    >
                      Auto-assign next
                    </Button>
                    <div className="flex items-center gap-2">
                      <input
                        className="rounded border px-3 py-1.5 text-sm"
                        placeholder="email to assign"
                        value={emailByDiv[d.id] ?? ''}
                        onChange={(e) =>
                          setEmailByDiv((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        loading={isBusy(`email-${d.id}`)}
                        onClick={() => assignByEmail(d)}
                      >
                        Assign by email
                      </Button>
                    </div>
                  </div>
                </div>

                {/* expanded */}
                {open[d.id] && (
                  <div className="px-4 pb-4">
                    {isBusy(`load-${d.id}`) ? (
                      <div className="text-gray-600 flex items-center gap-2">
                        <Spinner /> Loading…
                      </div>
                    ) : (assignments[d.id] ?? []).length === 0 ? (
                      <div className="text-gray-600">No assignments yet.</div>
                    ) : (
                      <div className="mt-2 overflow-hidden rounded border">
                        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600">
                          <div className="col-span-5">Player</div>
                          <div className="col-span-3">Status</div>
                          <div className="col-span-3">Created</div>
                          <div className="col-span-1 text-right">Actions</div>
                        </div>
                        <ul className="divide-y">
                          {(assignments[d.id] ?? []).map((a) => (
                            <li key={a.id} className="px-3 py-2 grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-5">
                                <div className="text-sm text-gray-900 font-medium">
                                  {a.user?.name || '—'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {a.user?.email || a.userId}
                                </div>
                              </div>
                              <div className="sm:col-span-3">
                                <Badge color={a.status === 'assigned' ? 'green' : 'gray'}>
                                  {a.status}
                                </Badge>
                              </div>
                              <div className="sm:col-span-3 text-sm text-gray-600">
                                {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                              </div>
                              <div className="sm:col-span-1 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={isBusy(`rem-${a.id}`)}
                                  onClick={() => removeAssignment(d, a)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}