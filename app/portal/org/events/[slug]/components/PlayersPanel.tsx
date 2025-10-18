'use client'

import { useMemo, useState, useEffect } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type Event = { id: string; title: string; slug: string | null }

type PlayerRow = {
  id: string           // registration id
  event_id: string
  user_id: string
  email: string
  name?: string | null
  status?: string | null
  checked_in?: boolean | null
  notes?: string | null
  created_at?: string | null
}

export default function PlayersPanel({
  event,
  onToast,
}: {
  event: Event
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [rows, setRows] = useState<PlayerRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const eventId = event.id

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/players`, { cache: 'no-store' })
      const data = await res.json()
      const items: PlayerRow[] = Array.isArray(data?.items) ? data.items : []
      setRows(items)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (rows ?? []).filter(r =>
      !term ||
      (r.name ?? '').toLowerCase().includes(term) ||
      (r.email ?? '').toLowerCase().includes(term)
    )
  }, [rows, q])

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    const em = email.trim().toLowerCase()
    if (!em) return onToast({ msg: 'Email required', kind: 'error' })
    setSaving(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, name: name.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to add')
      const created = await res.json()
      setRows(prev => [created, ...(prev ?? [])])
      setEmail(''); setName('')
      onToast({ msg: 'Player added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error adding player', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function setChecked(id: string, checked: boolean) {
    try {
      const res = await fetch(`/portal/api/registrations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked_in: checked }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update')
      const updated = await res.json()
      setRows(prev => prev?.map(r => r.id === id ? { ...r, ...updated } : r) ?? [])
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Check-in failed', kind: 'error' })
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this registration?')) return
    try {
      const res = await fetch(`/portal/api/registrations/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to delete')
      setRows(prev => prev?.filter(r => r.id !== id) ?? [])
      onToast({ msg: 'Removed', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  function exportCSV() {
    const headers = ['reg_id','event_id','user_id','name','email','checked_in','status','created_at']
    const lines = [headers.join(',')]
    for (const r of (filtered ?? [])) {
      lines.push([
        r.id, r.event_id, r.user_id,
        (r.name ?? '').replaceAll(',', ' '),
        (r.email ?? '').replaceAll(',', ' '),
        String(!!r.checked_in),
        r.status ?? '',
        r.created_at ?? '',
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `players-${event.slug ?? event.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Players</h2>
          <Badge color="blue">{rows?.length ?? 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-64 rounded border px-3 py-2 text-sm"
            aria-label="Search players"
          />
          <button onClick={exportCSV} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Export CSV
          </button>
        </div>
      </div>

      {/* Add by email */}
      <form onSubmit={addPlayer} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Player email *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Spinner size={16} />} Add Player
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Player</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Checked In</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2"><Spinner /> Loading…</div>
        ) : (filtered ?? []).length === 0 ? (
          <div className="p-4 text-gray-600">No players yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered!.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    <div className="font-medium">{r.name ?? '(no name)'}</div>
                    <div className="text-xs text-gray-500">Reg ID: {r.id}</div>
                  </div>
                  <div className="col-span-3 text-gray-700">{r.email}</div>
                  <div className="col-span-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!r.checked_in}
                        onChange={(e) => setChecked(r.id, e.target.checked)}
                      />
                      <span>Checked in</span>
                    </label>
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
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}