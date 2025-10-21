'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

type Division = {
  id: string
  event_id: string
  name: string
  cap: number | null
  created_at?: string | null
}

type Member = {
  id: string
  eventId: string
  divisionId: string
  userId: string
  createdAt: string | null
}

export default function DivisionsPanel({
  eventId,
  onToast,
}: {
  eventId: string
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [loading, setLoading] = useState(true)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [q, setQ] = useState('')

  // create division form
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCap, setNewCap] = useState<string>('')

  // expanded division -> members
  const [openId, setOpenId] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, Member[]>>({})
  const [membersLoading, setMembersLoading] = useState<Record<string, boolean>>({})
  const [addUserId, setAddUserId] = useState<Record<string, string>>({})
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch divisions
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((rows: Division[]) => {
        if (!alive) return
        setDivisions(Array.isArray(rows) ? rows : [])
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

  const filteredDivisions = useMemo(() => {
    const term = q.trim().toLowerCase()
    return divisions.filter((d) => !term || d.name.toLowerCase().includes(term))
  }, [divisions, q])

  // ─────────────────────────────────────────────────────────────────────────────
  // Expand division → lazy load members
  // ─────────────────────────────────────────────────────────────────────────────
  async function toggleOpen(div: Division) {
    const id = div.id
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (members[id]) return // already loaded
    setMembersLoading((m) => ({ ...m, [id]: true }))
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(id)}/members`,
        { cache: 'no-store' }
      )
      const rows: Member[] = res.ok ? await res.json() : []
      setMembers((m) => ({ ...m, [id]: rows }))
    } catch {
      setMembers((m) => ({ ...m, [id]: [] }))
    } finally {
      setMembersLoading((m) => ({ ...m, [id]: false }))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Create division
  // ─────────────────────────────────────────────────────────────────────────────
  async function createDivision(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return onToast({ msg: 'Division name is required', kind: 'error' })
    const capVal = newCap.trim() === '' ? null : Number(newCap)
    if (capVal !== null && Number.isNaN(capVal)) {
      return onToast({ msg: 'Cap must be a number', kind: 'error' })
    }
    setCreating(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cap: capVal }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create division')
      const created: Division = await res.json()
      setDivisions((prev) => [created, ...prev])
      setNewName('')
      setNewCap('')
      onToast({ msg: 'Division created', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Create failed', kind: 'error' })
    } finally {
      setCreating(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Add member to division (by userId)
  // ─────────────────────────────────────────────────────────────────────────────
  async function addMember(div: Division) {
    const userId = (addUserId[div.id] ?? '').trim()
    if (!userId) return onToast({ msg: 'userId required', kind: 'error' })
    setAddingFor(div.id)
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(div.id)}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to add member')
      const created: Member = await res.json()
      setMembers((map) => ({ ...map, [div.id]: [created, ...(map[div.id] ?? [])] }))
      setAddUserId((m) => ({ ...m, [div.id]: '' }))
      onToast({ msg: 'Player added to division', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Add failed', kind: 'error' })
    } finally {
      setAddingFor(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Remove member
  // ─────────────────────────────────────────────────────────────────────────────
  async function removeMember(div: Division, row: Member) {
    if (!confirm('Remove player from this division?')) return
    setRemovingMember(row.id)
    try {
      const url = new URL(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(div.id)}/members`,
        window.location.origin
      )
      url.searchParams.set('memberId', row.id)

      const res = await fetch(url.toString(), { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to remove')
      setMembers((map) => ({
        ...map,
        [div.id]: (map[div.id] ?? []).filter((m) => m.id !== row.id),
      }))
      onToast({ msg: 'Removed from division', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Remove failed', kind: 'error' })
    } finally {
      setRemovingMember(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Divisions</h2>
          <Badge color="blue">{divisions.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search divisions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-72 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Create division */}
      <form onSubmit={createDivision} className="mt-4 grid grid-cols-1 sm:grid-cols-6 gap-2">
        <input
          className="sm:col-span-3 rounded border px-3 py-2 text-sm"
          placeholder="Division name *"
          required
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="sm:col-span-2 rounded border px-3 py-2 text-sm"
          placeholder="Cap (optional)"
          inputMode="numeric"
          value={newCap}
          onChange={(e) => setNewCap(e.target.value)}
        />
        <div className="sm:col-span-1">
          <Button disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>

      {/* List */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-6">Division</div>
          <div className="col-span-2">Cap</div>
          <div className="col-span-2">Members</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2"><Spinner /> Loading…</div>
        ) : filteredDivisions.length === 0 ? (
          <div className="p-4 text-gray-600">No divisions yet.</div>
        ) : (
          <ul className="divide-y">
            {filteredDivisions.map((d) => {
              const list = members[d.id] ?? []
              const count = list.length
              return (
                <li key={d.id} className="px-4 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6">
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500">ID: {d.id}</div>
                    </div>
                    <div className="sm:col-span-2 text-sm text-gray-700">{d.cap ?? '—'}</div>
                    <div className="sm:col-span-2 text-sm text-gray-700">{count}</div>
                    <div className="sm:col-span-2 flex sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleOpen(d)}
                      >
                        {openId === d.id ? 'Hide' : 'Manage'}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: members + add */}
                  {openId === d.id && (
                    <div className="mt-4 rounded-lg border bg-white p-3">
                      {/* Add member */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                        <div className="text-sm font-semibold text-gray-700">Members</div>
                        <div className="flex gap-2">
                          <input
                            placeholder="userId to add"
                            value={addUserId[d.id] ?? ''}
                            onChange={(e) =>
                              setAddUserId((m) => ({ ...m, [d.id]: e.target.value }))
                            }
                            className="w-56 rounded border px-3 py-2 text-sm"
                          />
                          <Button size="sm" onClick={() => addMember(d)} disabled={addingFor === d.id}>
                            {addingFor === d.id ? 'Adding…' : 'Add'}
                          </Button>
                        </div>
                      </div>

                      {/* Members table */}
                      <div className="mt-3 overflow-hidden rounded border">
                        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-600">
                          <div className="col-span-7">User ID</div>
                          <div className="col-span-3">Added</div>
                          <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {membersLoading[d.id] ? (
                          <div className="p-3 text-gray-600 flex items-center gap-2">
                            <Spinner /> Loading members…
                          </div>
                        ) : list.length === 0 ? (
                          <div className="p-3 text-gray-600">No members yet.</div>
                        ) : (
                          <ul className="divide-y">
                            {list.map((m) => (
                              <li key={m.id} className="px-3 py-2">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                  <div className="sm:col-span-7 text-sm">{m.userId}</div>
                                  <div className="sm:col-span-3 text-sm text-gray-700">
                                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                                  </div>
                                  <div className="sm:col-span-2 text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeMember(d, m)}
                                      disabled={removingMember === m.id}
                                    >
                                      {removingMember === m.id ? 'Removing…' : 'Remove'}
                                    </Button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}