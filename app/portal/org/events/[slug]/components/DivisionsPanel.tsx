'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

type Event = { id: string; slug: string | null; title: string }

type Division = {
  id: string
  event_id: string
  name: string
  capacity?: number | null
  fee_cents?: number | null
  min_age?: number | null
  max_age?: number | null
  created_at?: string | null
}

const PRESETS: Array<Partial<Division> & { label: string }> = [
  { label: 'Open', name: 'Open' },
  { label: 'Women', name: 'Women' },
  { label: 'Seniors (50+)', name: 'Seniors', min_age: 50 },
  { label: 'Kids (≤12)', name: 'Kids', max_age: 12 },
  { label: 'Teens (13–17)', name: 'Teens', min_age: 13, max_age: 17 },
]

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

  // Create/edit form
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState<string>('')
  const [feeCents, setFeeCents] = useState<string>('') // store as cents string
  const [minAge, setMinAge] = useState<string>('')
  const [maxAge, setMaxAge] = useState<string>('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data) => {
        if (!alive) return
        setRows(data as Division[])
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
    return (rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term))
  }, [rows, q])

  function resetForm() {
    setEditingId(null)
    setName('')
    setCapacity('')
    setFeeCents('')
    setMinAge('')
    setMaxAge('')
  }

  function loadForEdit(d: Division) {
    setEditingId(d.id)
    setName(d.name)
    setCapacity(d.capacity != null ? String(d.capacity) : '')
    setFeeCents(d.fee_cents != null ? String(d.fee_cents) : '')
    setMinAge(d.min_age != null ? String(d.min_age) : '')
    setMaxAge(d.max_age != null ? String(d.max_age) : '')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      onToast({ msg: 'Division name is required', kind: 'error' })
      return
    }

    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisionId: editingId || undefined,
          name: name.trim(),
          capacity: capacity ? Number(capacity) : null,
          fee_cents: feeCents ? Number(feeCents) : null,
          min_age: minAge ? Number(minAge) : null,
          max_age: maxAge ? Number(maxAge) : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')
      const saved = (await res.json()) as Division

      setRows((prev) => {
        if (!prev) return [saved]
        const idx = prev.findIndex((r) => r.id === saved.id)
        if (idx >= 0) {
          const copy = prev.slice()
          copy[idx] = saved
          return copy
        }
        return [saved, ...prev]
      })
      resetForm()
      onToast({ msg: editingId ? 'Division updated' : 'Division created', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error', kind: 'error' })
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this division?')) return
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Delete failed')
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? [])
      if (editingId === id) resetForm()
      onToast({ msg: 'Division removed', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error', kind: 'error' })
    }
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    setEditingId(null)
    setName((p.name ?? '') as string)
    setCapacity('')
    setFeeCents('')
    setMinAge(p.min_age != null ? String(p.min_age) : '')
    setMaxAge(p.max_age != null ? String(p.max_age) : '')
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

      {/* Presets */}
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p.label} size="sm" variant="outline" onClick={() => applyPreset(p)}>
            {p.label}
          </Button>
        ))}
      </div>

      {/* Create / Edit form */}
      <form onSubmit={save} className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm md:col-span-2"
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Fee (cents)"
          value={feeCents}
          onChange={(e) => setFeeCents(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Min age"
          value={minAge}
          onChange={(e) => setMinAge(e.target.value)}
          inputMode="numeric"
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Max age"
          value={maxAge}
          onChange={(e) => setMaxAge(e.target.value)}
          inputMode="numeric"
        />
        <div className="md:col-span-6 flex gap-2">
          <Button type="submit">{editingId ? 'Update' : 'Add'} Division</Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Capacity</div>
          <div className="col-span-2">Fee</div>
          <div className="col-span-2">Ages</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No divisions yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <div className="font-medium">{d.name}</div>
                  </div>
                  <div className="col-span-2 text-sm text-gray-700">{d.capacity ?? '—'}</div>
                  <div className="col-span-2 text-sm text-gray-700">
                    {d.fee_cents != null ? `$${(d.fee_cents / 100).toFixed(2)}` : '—'}
                  </div>
                  <div className="col-span-2 text-sm text-gray-700">
                    {d.min_age ?? '—'}{d.min_age != null || d.max_age != null ? '–' : ''}{d.max_age ?? '—'}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadForEdit(d)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(d.id)}>
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