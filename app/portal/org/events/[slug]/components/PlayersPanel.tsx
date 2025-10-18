'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type RegistrationRow = {
  id: string
  eventId: string
  userId: string
  createdAt?: string
  status?: 'Registered' | 'Paid' | 'Waitlisted' | 'Checked-In' | 'No-Show'
  notes?: string
  user?: { id: string; email?: string | null; name?: string | null } | null
}

export default function PlayersPanel({
  eventId,
  onToast,
}: {
  eventId: string
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [rows, setRows] = useState<RegistrationRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // Add form
  const [emailOrId, setEmailOrId] = useState('')
  const [name, setName] = useState('') // optional when adding by email
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data: RegistrationRow[]) => {
        if (!alive) return
        setRows(data ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setRows([])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [eventId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => {
      const name = r.user?.name ?? ''
      const email = r.user?.email ?? ''
      return (
        !term ||
        name.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        r.userId.toLowerCase().includes(term) ||
        (r.status ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, q])

  function exportCSV() {
    const headers = ['id', 'eventId', 'userId', 'name', 'email', 'status', 'notes', 'createdAt']
    const lines = [headers.join(',')]
    ;(filtered ?? []).forEach((r) => {
      lines.push(
        [
          r.id ?? '',
          r.eventId ?? '',
          r.userId ?? '',
          (r.user?.name ?? '').replaceAll(',', ' '),
          (r.user?.email ?? '').replaceAll(',', ' '),
          r.status ?? '',
          (r.notes ?? '').replaceAll(',', ' '),
          r.createdAt ?? '',
        ].join(',')
      )
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `players-${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function isEmail(s: string) {
    return /\S+@\S+\.\S+/.test(s)
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    const val = emailOrId.trim()
    if (!val) return
    setAdding(true)
    try {
      const body = isEmail(val)
        ? { email: val, ...(name.trim() ? { name: name.trim() } : {}) }
        : { userId: val }

      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to add')
      const created = (await res.json()) as RegistrationRow
      setRows((prev) => [created, ...(prev ?? [])])
      setEmailOrId('')
      setName('')
      onToast({ msg: isEmail(val) ? 'Player invited/created' : 'Player added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error', kind: 'error' })
    } finally {
      setAdding(false)
    }
  }

  async function updateStatus(id: string, status: RegistrationRow['status']) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update status')
      const updated = (await res.json()) as RegistrationRow
      setRows((prev) => prev?.map((r) => (r.id === id ? updated : r)) ?? [])
      onToast({ msg: 'Status updated', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Update failed', kind: 'error' })
    }
  }

  async function updateNotes(id: string, notes: string) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update notes')
      const updated = (await res.json()) as RegistrationRow
      setRows((prev) => prev?.map((r) => (r.id === id ? updated : r)) ?? [])
      onToast({ msg: 'Notes saved', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Save failed', kind: 'error' })
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to delete')
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? [])
      onToast({ msg: 'Removed player', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Players</h2>
          <Badge color="blue">{rows?.length ?? 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search name / email / userId / status…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-72 rounded border px-3 py-2 text-sm"
            aria-label="Search players"
          />
          <button onClick={exportCSV} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Export CSV
          </button>
        </div>
      </div>

      {/* Add player */}
      <form onSubmit={addPlayer} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Email or userId *"
          value={emailOrId}
          onChange={(e) => setEmailOrId(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Name (optional for email signups)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <button
            disabled={adding}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {adding ? 'Adding…' : 'Add Player'}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-4">Player</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-4">Notes</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No players yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => {
              const [draftNotes, setDraftNotes] = useState(r.notes ?? '')
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="col-span-4">
                      <div className="font-medium">{r.user?.name ?? r.userId}</div>
                      <div className="text-sm text-gray-600">{r.user?.email ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <select
                        value={r.status ?? 'Registered'}
                        onChange={(e) => updateStatus(r.id, e.target.value as RegistrationRow['status'])}
                        className="w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="Registered">Registered</option>
                        <option value="Paid">Paid</option>
                        <option value="Waitlisted">Waitlisted</option>
                        <option value="Checked-In">Checked-In</option>
                        <option value="No-Show">No-Show</option>
                      </select>
                    </div>

                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <input
                          value={draftNotes}
                          onChange={(e) => setDraftNotes(e.target.value)}
                          className="w-full rounded border px-3 py-2 text-sm"
                          placeholder="Notes…"
                        />
                        <button
                          onClick={() => updateNotes(r.id, draftNotes)}
                          type="button"
                          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                          title="Save notes"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}