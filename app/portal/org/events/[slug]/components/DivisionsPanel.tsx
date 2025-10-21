'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

type Division = {
  id: string
  name: string
  cap: number | null
  createdAt: string | null
  assignedCount: number
  waitlistedCount: number
}

type PlayerRow = {
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
  const [loading, setLoading] = useState(true)
  const [divs, setDivs] = useState<Division[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCap, setNewCap] = useState<string>('')

  // load divisions + players
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`).then(r => r.json()),
      fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`).then(r => r.json()),
    ])
      .then(([ds, rs]) => {
        if (!alive) return
        setDivs(ds || [])
        setPlayers(rs || [])
      })
      .catch(() => {
        if (!alive) return
        setDivs([])
        setPlayers([])
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [eventId])

  const filteredPlayers = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (players ?? []).filter((r) => {
      const n = r.user?.name ?? ''
      const e = r.user?.email ?? ''
      return (
        !term ||
        n.toLowerCase().includes(term) ||
        e.toLowerCase().includes(term) ||
        r.userId.toLowerCase().includes(term)
      )
    })
  }, [players, q])

  async function createDivision(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    const cap = newCap.trim() === '' ? null : Number(newCap)
    if (!name) return onToast({ msg: 'Division name required', kind: 'error' })

    setCreating(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cap }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Create failed')
      const created = await res.json()
      setDivs((prev) => [...prev, created])
      setNewName(''); setNewCap('')
      onToast({ msg: 'Division created', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error', kind: 'error' })
    } finally {
      setCreating(false)
    }
  }

  async function updateDivision(div: Division, patch: Partial<Pick<Division, 'name' | 'cap'>>) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(div.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Update failed')
      const updated = await res.json()
      setDivs(prev => prev.map(d => d.id === div.id ? { ...d, ...updated } : d))
      onToast({ msg: 'Division updated', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Update failed', kind: 'error' })
    }
  }

  async function deleteDivision(div: Division) {
    if (!confirm(`Delete division "${div.name}"?`)) return
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(div.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Delete failed')
      setDivs(prev => prev.filter(d => d.id !== div.id))
      onToast({ msg: 'Division deleted', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  async function assign(div: Division, userId: string) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(div.id)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Assign failed')
      const { status } = await res.json()
      setDivs(prev => prev.map(d => {
        if (d.id !== div.id) return d
        if (status === 'assigned') return { ...d, assignedCount: d.assignedCount + 1 }
        return { ...d, waitlistedCount: d.waitlistedCount + 1 }
      }))
      onToast({ msg: status === 'assigned' ? 'Assigned' : 'Waitlisted (cap reached)', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Assign failed', kind: 'error' })
    }
  }

  // UI
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Divisions</h2>
          <Badge color="blue">{divs.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search players by name / email / id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-80 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Create division */}
      <form onSubmit={createDivision} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Division name * (e.g., Social, Competitive, Advanced)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Cap (optional)"
          inputMode="numeric"
          value={newCap}
          onChange={(e) => setNewCap(e.target.value)}
        />
        <div className="sm:col-span-1">
          <Button disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>

      {loading ? (
        <div className="p-4 text-gray-600 flex items-center gap-2"><Spinner /> Loading…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Divisions list / edit */}
          <section className="rounded-lg border">
            <div className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Manage Divisions</div>
            {divs.length === 0 ? (
              <div className="p-4 text-gray-600">No divisions yet.</div>
            ) : (
              <ul className="divide-y">
                {divs.map((d) => (
                  <li key={d.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-sm text-gray-600">
                          Cap: {d.cap ?? '—'} · Assigned: {d.assignedCount} · Waitlist: {d.waitlistedCount}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const name = prompt('Rename division', d.name)?.trim()
                            if (!name) return
                            updateDivision(d, { name })
                          }}
                        >
                          Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const v = prompt('Set cap (blank for none)', d.cap ?? '')
                            const cap = v === null || v.trim() === '' ? null : Number(v)
                            if (cap !== null && Number.isNaN(cap)) return onToast({ msg: 'Invalid cap', kind: 'error' })
                            updateDivision(d, { cap })
                          }}
                        >
                          Set Cap
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDivision(d)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Assign players */}
          <section className="rounded-lg border">
            <div className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Assign Players</div>
            {filteredPlayers.length === 0 ? (
              <div className="p-4 text-gray-600">No players match your search.</div>
            ) : (
              <ul className="divide-y max-h-[540px] overflow-auto">
                {filteredPlayers.map((r) => (
                  <li key={r.id ?? `${r.userId}-${r.createdAt}`} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{r.user?.name ?? r.userId}</div>
                        <div className="text-sm text-gray-600">{r.user?.email ?? '—'}</div>
                      </div>
                      <div className="flex gap-2">
                        {divs.map((d) => (
                          <Button key={d.id} size="sm" onClick={() => assign(d, r.userId)}>
                            {d.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}