'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type Event = { id: string; title: string; slug: string | null }
type User = { id: string; name?: string | null; email: string; created_at?: string | null }
type Props = {
  event: Event
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}

export default function PlayersPanel({ event, onToast }: Props) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function search() {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/users?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setRows(json.items ?? [])
    } catch {
      onToast({ msg: 'Search failed', kind: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // initial fetch (recent users)
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return onToast({ msg: 'Email required', kind: 'error' })
    try {
      const res = await fetch(`/portal/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, email: email.trim() }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Create failed')
      const created = (await res.json()) as User
      setRows((prev) => [created, ...prev])
      setName('')
      setEmail('')
      onToast({ msg: 'Player created', kind: 'success' })
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Create failed', kind: 'error' })
    }
  }

  async function register(userId: string) {
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(event.id)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Register failed')
      onToast({ msg: 'Registered to event', kind: 'success' })
    } catch (e: any) {
      onToast({ msg: e?.message ?? 'Register failed', kind: 'error' })
    }
  }

  const filtered = useMemo(() => rows, [rows])

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Players</h2>
          <Badge color="blue">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-full sm:w-64 rounded border px-3 py-2 text-sm"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' ? search() : undefined)}
          />
          <button onClick={search} className="rounded border px-3 py-2 text-sm hover:bg-gray-50" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Create Player */}
      <form onSubmit={addUser} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
        />
        <button className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90">
          Add Player
        </button>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Player</div>
          <div className="col-span-5">Email</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2"><Spinner /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No players found.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((u) => (
              <li key={u.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 font-medium">{u.name ?? '—'}</div>
                  <div className="col-span-5 text-gray-700">{u.email}</div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => register(u.id)}
                      className="rounded bg-usaBlue text-white px-3 py-1 text-sm hover:opacity-90"
                    >
                      Register to Event
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