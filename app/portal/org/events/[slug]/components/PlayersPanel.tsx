'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

type Row = {
  id?: string
  eventId: string
  userId: string
  createdAt?: string
  user?: { id: string; email?: string | null; name?: string | null } | null
}

export default function PlayersPanel({
  eventId,
  onToast,
}: {
  eventId: string
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  // ── Fetch players ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data) => {
        if (!alive) return
        setRows(data)
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

  // ── Search filter ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => {
      const n = r.user?.name ?? ''
      const e = r.user?.email ?? ''
      return (
        !term ||
        n.toLowerCase().includes(term) ||
        e.toLowerCase().includes(term) ||
        r.userId.toLowerCase().includes(term)
      )
    })
  }, [rows, q])

  // ── Add player by email ──────────────────────────────────────────
  async function addByEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      onToast({ msg: 'Email is required', kind: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/registrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            name: name.trim() || undefined,
          }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to add')
      const created = (await res.json()) as Row
      setRows((prev) => [created, ...(prev ?? [])])
      setEmail('')
      setName('')
      onToast({ msg: 'Player added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error adding player', kind: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Remove player ────────────────────────────────────────────────
  async function removePlayer(row: Row) {
    const confirmDelete = window.confirm(
      `Remove ${row.user?.name || row.user?.email || row.userId}?`
    )
    if (!confirmDelete) return
    setRemoving(row.id ?? row.userId)
    try {
      const qs = row.id
        ? `registrationId=${encodeURIComponent(row.id)}`
        : `userId=${encodeURIComponent(row.userId)}`
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/registrations?${qs}`,
        { method: 'DELETE' }
      )
      if (!res.ok)
        throw new Error((await res.json())?.error ?? 'Failed to remove')
      setRows((prev) => (prev ?? []).filter((r) => r !== row))
      onToast({ msg: 'Player removed', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Remove failed', kind: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────
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
            placeholder="Search name / email / userId…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-72 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Add player */}
      <form
        onSubmit={addByEmail}
        className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2"
      >
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Email *"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <Button disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Player'}
          </Button>
        </div>
      </form>

      {/* Table header */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Registered</div>
          <div className="col-span-1 text-right">ID</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table body */}
        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No players yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li
                key={r.id ?? `${r.userId}-${r.createdAt}`}
                className="px-4 py-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-4 font-medium">
                    {r.user?.name ?? '—'}
                  </div>
                  <div className="col-span-4 text-gray-700">
                    {r.user?.email ?? '—'}
                  </div>
                  <div className="col-span-2 text-gray-700">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : '—'}
                  </div>
                  <div className="col-span-1 text-right text-xs text-gray-500 truncate">
                    {r.userId}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => removePlayer(r)}
                      disabled={removing === (r.id ?? r.userId)}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {removing === (r.id ?? r.userId) ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}