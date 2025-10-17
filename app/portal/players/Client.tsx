'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Player = { id: string; email: string; name?: string | null; createdAt?: string | null }

export default function Client() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [rows, setRows] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const pages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    let alive = true
    setLoading(true)
    const url = `/portal/api/players?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`
    fetch(url)
      .then(r => r.json())
      .then(data => { if (!alive) return; setRows(data.items || []); setTotal(data.total || 0); setLoading(false) })
      .catch(() => { if (!alive) return; setRows([]); setTotal(0); setLoading(false) })
    return () => { alive = false }
  }, [q, page, pageSize])

  const canCreate = email.trim().length > 3

  async function createPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    setSaving(true)
    try {
      const res = await fetch('/portal/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create player')
      setEmail(''); setName('')
      // refetch first page to show newest
      setPage(1)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const empty = !loading && rows.length === 0

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Players</h1>
          <p className="text-gray-600 text-sm">Search, add, and manage player accounts.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create */}
        <form onSubmit={createPlayer} className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Add Player</h2>
          <p className="text-sm text-gray-600">Create a player account by email. Name is optional.</p>
          <div className="mt-3 grid gap-2">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Email *"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              type="email"
              required
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Name (optional)"
              value={name}
              onChange={(e)=>setName(e.target.value)}
            />
            <button
              disabled={!canCreate || saving}
              className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create Player'}
            </button>
          </div>
        </form>

        {/* Search + List */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-lg font-semibold">Directory</h2>
            <input
              className="rounded border px-3 py-2 text-sm w-full sm:w-72"
              placeholder="Search email or name…"
              value={q}
              onChange={(e)=>{ setPage(1); setQ(e.target.value) }}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
              <div className="col-span-5">Player</div>
              <div className="col-span-5">Email</div>
              <div className="col-span-2">Created</div>
            </div>
            {loading ? (
              <div className="p-4 text-gray-600">Loading…</div>
            ) : empty ? (
              <div className="p-4 text-gray-600">No players found.</div>
            ) : (
              <ul className="divide-y">
                {rows.map(p => (
                  <li key={p.id} className="px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="col-span-5 font-medium">{p.name ?? '—'}</div>
                      <div className="col-span-5 text-gray-700">{p.email}</div>
                      <div className="col-span-2 text-sm text-gray-600">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pager */}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <button
                onClick={()=> setPage(p => Math.max(1, p-1))}
                disabled={page<=1}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {page} / {pages}</span>
              <button
                onClick={()=> setPage(p => Math.min(pages, p+1))}
                disabled={page>=pages}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Helpful link for now */}
      <div className="mt-8 text-sm">
        <Link href="/portal/org/events" className="text-usaBlue hover:underline">
          ← Back to Organizer Events
        </Link>
      </div>
    </div>
  )
}