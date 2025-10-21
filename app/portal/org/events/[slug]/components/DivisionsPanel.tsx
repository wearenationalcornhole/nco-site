'use client'

import { useEffect, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'

type DivisionRow = {
  id?: string
  event_id: string
  name: string
  cap: number | null
  created_at?: string | null
}

export default function DivisionsPanel({
  eventId,
  onToast,
}: {
  eventId: string
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [divisions, setDivisions] = useState<DivisionRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [cap, setCap] = useState<number | ''>('')

  // ── Load divisions ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data) => {
        if (!alive) return
        setDivisions(data)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setDivisions([])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [eventId])

  // ── Add division ─────────────────────────────────────────────────
  async function addDivision(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return onToast({ msg: 'Name required', kind: 'error' })
    setAdding(true)
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            cap: cap === '' ? null : Number(cap),
          }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Add failed')
      const created = await res.json()
      setDivisions((prev) => [created, ...(prev ?? [])])
      setName('')
      setCap('')
      onToast({ msg: 'Division added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Add failed', kind: 'error' })
    } finally {
      setAdding(false)
    }
  }

  // ── Update division ───────────────────────────────────────────────
  async function updateDivision(
    row: DivisionRow,
    changes: Partial<DivisionRow>
  ) {
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id, ...changes }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Update failed')
      setDivisions((prev) =>
        (prev ?? []).map((d) =>
          d.id === row.id ? { ...d, ...changes } : d
        )
      )
      onToast({ msg: 'Division updated', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Update failed', kind: 'error' })
    }
  }

  // ── Remove division ───────────────────────────────────────────────
  async function removeDivision(row: DivisionRow) {
    const confirmDelete = window.confirm(`Remove division "${row.name}"?`)
    if (!confirmDelete) return
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions?id=${encodeURIComponent(
          row.id ?? ''
        )}`,
        { method: 'DELETE' }
      )
      if (!res.ok)
        throw new Error((await res.json())?.error ?? 'Delete failed')
      setDivisions((prev) => (prev ?? []).filter((d) => d.id !== row.id))
      onToast({ msg: 'Division removed', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Divisions</h2>
        <Button
          size="sm"
          onClick={() => {
            const v = prompt('Add new division name:')
            if (!v || !v.trim()) return
            setName(v)
            setCap('')
          }}
        >
          + New
        </Button>
      </div>

      {/* Add division form */}
      {name && (
        <form onSubmit={addDivision} className="mt-4 flex gap-2">
          <input
            type="text"
            className="rounded border px-3 py-2 text-sm flex-1"
            placeholder="Division name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            className="rounded border px-3 py-2 text-sm w-24"
            placeholder="Cap"
            value={cap}
            onChange={(e) =>
              setCap(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          <Button type="submit" disabled={adding}>
            {adding ? 'Adding…' : 'Save'}
          </Button>
        </form>
      )}

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-6">Division</div>
          <div className="col-span-2">Cap</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : !divisions || divisions.length === 0 ? (
          <div className="p-4 text-gray-600">No divisions yet.</div>
        ) : (
          <ul className="divide-y">
            {divisions.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-6 font-medium text-gray-900">
                    {d.name}
                  </div>
                  <div className="col-span-2 text-gray-700">
                    {d.cap ?? '—'}
                  </div>
                  <div className="col-span-2 text-gray-500 text-sm">
                    {d.created_at
                      ? new Date(d.created_at).toLocaleDateString()
                      : '—'}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        // ✅ FIXED prompt argument typing
                        const v = prompt(
                          'Set cap (blank for none)',
                          d.cap != null ? String(d.cap) : ''
                        )
                        const cap =
                          v === null || v.trim() === '' ? null : Number(v)
                        if (
                          cap !== null &&
                          Number.isNaN(cap)
                        )
                          return onToast({
                            msg: 'Invalid cap',
                            kind: 'error',
                          })
                        updateDivision(d, { cap })
                      }}
                    >
                      Set Cap
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDivision(d)}
                    >
                      Remove
                    </Button>
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