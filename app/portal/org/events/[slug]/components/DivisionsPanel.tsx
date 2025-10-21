// app/portal/org/events/[slug]/components/DivisionsPanel.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
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
  const [rows, setRows] = useState<DivisionRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [name, setName] = useState('')
  const [cap, setCap] = useState<string>('') // keep as string for easy input
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data) => {
        if (!alive) return
        setRows(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setRows([])
        setLoading(false)
      })
    return () => { alive = false }
  }, [eventId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (rows ?? []).filter(r => !term || r.name.toLowerCase().includes(term))
  }, [rows, q])

  async function addDivision(e: React.FormEvent) {
    e.preventDefault()
    const nm = name.trim()
    const cp = cap.trim() ? Number(cap.trim()) : null
    if (!nm) { onToast({ msg: 'Name is required', kind: 'error' }); return }
    if (cp !== null && (!Number.isFinite(cp) || cp < 0)) { onToast({ msg: 'Cap must be a positive number', kind: 'error' }); return }

    setSaving(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nm, cap: cp }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create')
      const created = await res.json() as DivisionRow
      setRows(prev => [created, ...(prev ?? [])])
      setName(''); setCap('')
      onToast({ msg: 'Division added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error creating division', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(id?: string) {
    if (!id) return
    const ok = confirm('Delete this division?')
    if (!ok) return
    setRemoving(id)
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to delete')
      setRows(prev => (prev ?? []).filter(r => r.id !== id))
      onToast({ msg: 'Division deleted', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Divisions</h2>
          <Badge color="blue">{rows?.length ?? 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search divisions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-64 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Create */}
      <form onSubmit={addDivision} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Division name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Capacity (optional)"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          inputMode="numeric"
        />
        <div>
          <Button disabled={saving}>{saving ? 'Saving…' : 'Add Division'}</Button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-6">Division</div>
          <div className="col-span-2">Cap</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2"><Spinner /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No divisions yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((d) => (
              <li key={d.id ?? d.name} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6 font-medium">{d.name}</div>
                  <div className="sm:col-span-2 text-gray-700">{d.cap ?? '—'}</div>
                  <div className="sm:col-span-2 text-sm text-gray-600">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</div>
                  <div className="sm:col-span-2 text-right">
                    <button
                      onClick={() => remove(d.id)}
                      disabled={removing === d.id}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {removing === d.id ? '…' : 'Delete'}
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