'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type Event = {
  id: string
  slug: string | null
  title: string
}

type Division = {
  id: string
  eventId: string
  name: string
  notes?: string | null
  createdAt?: string | null
}

export default function DivisionsPanel({
  event,
  onToast,
}: {
  event: Event
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const eventId = event.id
  const [rows, setRows] = useState<Division[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  // Load divisions
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((payload) => {
        if (!alive) return
        setRows((payload?.rows ?? []) as Division[])
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
    return (rows ?? []).filter(
      (r) => !term || r.name.toLowerCase().includes(term) || (r.notes ?? '').toLowerCase().includes(term)
    )
  }, [rows, q])

  async function quickAdd(label: string) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to add')
      const created = (await res.json()) as Division
      setRows((prev) => [created, ...(prev ?? [])])
      onToast({ msg: `Added "${label}"`, kind: 'success' })
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Error adding division', kind: 'error' })
    }
  }

  async function addDivision(e: React.FormEvent) {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    setAdding(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nm, notes: notes || undefined }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create division')
      const created = (await res.json()) as Division
      setRows((prev) => [created, ...(prev ?? [])])
      setName('')
      setNotes('')
      onToast({ msg: 'Division created', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error creating division', kind: 'error' })
    } finally {
      setAdding(false)
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to delete')
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? [])
      onToast({ msg: 'Division removed', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Divisions</h2>
          <Badge color="blue">{rows?.length ?? 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search name / notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-64 rounded border px-3 py-2 text-sm"
            aria-label="Search divisions"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          onClick={() => quickAdd('Kids (≤12)')}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
        >
          + Kids (≤12)
        </button>
        <button
          type="button"
          onClick={() => quickAdd('Teens (13–17)')}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
        >
          + Teens (13–17)
        </button>
      </div>

      {/* Create */}
      <form onSubmit={addDivision} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Division name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div>
          <button
            disabled={adding}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {adding && <Spinner size={16} />} Add Division
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-6">Name</div>
          <div className="col-span-4">Notes</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : (filtered?.length ?? 0) === 0 ? (
          <div className="p-4 text-gray-600">No divisions yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered!.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-6 font-medium break-words">{d.name}</div>
                  <div className="col-span-4 text-sm text-gray-600 break-words">{d.notes ?? '—'}</div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => remove(d.id)}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Remove
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