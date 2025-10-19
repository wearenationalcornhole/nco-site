'use client'

import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */
type Division = {
  id: string
  eventId: string
  name: string
  cap: number | null
  createdAt: string | null
}

type Member = {
  id: string
  eventId: string
  divisionId: string
  userId: string
  createdAt?: string | null
  user?: { id: string; email?: string | null; name?: string | null } | null
}

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function DivisionsPanel({
  eventId,
  onToast,
}: {
  eventId: string
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [rows, setRows] = useState<Division[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // create form
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [capText, setCapText] = useState('')

  // inline edit state (track per-division)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCapText, setEditCapText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // members drawer / panel state (track open division + its members)
  const [openDivisionId, setOpenDivisionId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [membersLoading, setMembersLoading] = useState(false)
  const [addMSubmitting, setAddMSubmitting] = useState(false)
  const [addMEmail, setAddMEmail] = useState('')
  const [addMUserId, setAddMUserId] = useState('')

  /* ── Fetch divisions on mount ─────────────────────────────── */
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
    return () => {
      alive = false
    }
  }, [eventId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (rows ?? []).filter(
      (d) =>
        !term ||
        d.name.toLowerCase().includes(term) ||
        String(d.cap ?? '').toLowerCase().includes(term)
    )
  }, [rows, q])

  /* ── Helpers ──────────────────────────────────────────────── */
  function parseCap(text: string): number | null {
    const t = text.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  /* ── Create Division ──────────────────────────────────────── */
  async function createDivision(e: React.FormEvent) {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return onToast({ msg: 'Division name is required', kind: 'error' })
    setCreating(true)
    try {
      const cap = parseCap(capText)
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nm, cap }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create')
      const created = (await res.json()) as Division
      setRows((prev) => [created, ...(prev ?? [])])
      setName('')
      setCapText('')
      onToast({ msg: 'Division created', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error creating division', kind: 'error' })
    } finally {
      setCreating(false)
    }
  }

  /* ── Begin Edit ───────────────────────────────────────────── */
  function beginEdit(d: Division) {
    setEditId(d.id)
    setEditName(d.name)
    setEditCapText(d.cap === null ? '' : String(d.cap))
  }

  /* ── Save Edit ────────────────────────────────────────────── */
  async function saveEdit() {
    if (!editId) return
    const nm = editName.trim()
    if (!nm) return onToast({ msg: 'Name cannot be empty', kind: 'error' })
    setSavingEdit(true)
    try {
      const cap = parseCap(editCapText)
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(editId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nm, cap }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Update failed')
      const updated = (await res.json()) as Division
      setRows((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? [])
      setEditId(null)
      onToast({ msg: 'Division updated', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error updating', kind: 'error' })
    } finally {
      setSavingEdit(false)
    }
  }

  /* ── Delete Division ─────────────────────────────────────── */
  async function deleteDivision(id: string) {
    const ok = window.confirm('Delete this division? Members in it will be removed from this division.')
    if (!ok) return
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Delete failed')
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? [])
      if (openDivisionId === id) {
        setOpenDivisionId(null)
        setMembers(null)
      }
      onToast({ msg: 'Division deleted', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  /* ── Members Drawer ──────────────────────────────────────── */
  async function openMembers(d: Division) {
    if (openDivisionId === d.id) {
      // toggle close
      setOpenDivisionId(null)
      setMembers(null)
      return
    }
    setOpenDivisionId(d.id)
    setMembersLoading(true)
    setMembers(null)
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(d.id)}/members`
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to load members')
      const list = (await res.json()) as Member[]
      setMembers(list)
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Failed to load members', kind: 'error' })
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    if (!openDivisionId) return
    if (!addMEmail.trim() && !addMUserId.trim()) {
      return onToast({ msg: 'Provide email or userId', kind: 'error' })
    }
    setAddMSubmitting(true)
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(openDivisionId)}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: addMEmail.trim() || undefined,
            userId: addMUserId.trim() || undefined,
          }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Add failed')
      const created = (await res.json()) as Member
      setMembers((prev) => [created, ...(prev ?? [])])
      setAddMEmail('')
      setAddMUserId('')
      onToast({ msg: 'Member added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Add failed', kind: 'error' })
    } finally {
      setAddMSubmitting(false)
    }
  }

  async function removeMember(m: Member) {
    if (!openDivisionId) return
    const ok = window.confirm(`Remove ${m.user?.name || m.user?.email || m.userId} from this division?`)
    if (!ok) return
    try {
      const qs = m.id
        ? `memberId=${encodeURIComponent(m.id)}`
        : `userId=${encodeURIComponent(m.userId)}`
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/divisions/${encodeURIComponent(openDivisionId)}/members?${qs}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Remove failed')
      setMembers((prev) => (prev ?? []).filter((x) => x !== m))
      onToast({ msg: 'Member removed', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Remove failed', kind: 'error' })
    }
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Header row */}
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
            className="w-full sm:w-72 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={createDivision} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Division name *"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Cap (blank for unlimited)"
          value={capText}
          onChange={(e) => setCapText(e.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <div>
          <Button disabled={creating}>{creating ? 'Creating…' : 'Create Division'}</Button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Division</div>
          <div className="col-span-2">Cap</div>
          <div className="col-span-3">Created</div>
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
            {filtered.map((d) => {
              const isEditing = editId === d.id
              const isOpen = openDivisionId === d.id
              return (
                <li key={d.id} className="px-4 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Name (or edit) */}
                    <div className="sm:col-span-5">
                      {isEditing ? (
                        <input
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <div className="font-medium">{d.name}</div>
                      )}
                    </div>

                    {/* Cap (or edit) */}
                    <div className="sm:col-span-2">
                      {isEditing ? (
                        <input
                          className="w-full rounded border px-3 py-2 text-sm"
                          placeholder="(blank for unlimited)"
                          value={editCapText}
                          onChange={(e) => setEditCapText(e.target.value)}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      ) : (
                        <div className="text-gray-700">{d.cap ?? '—'}</div>
                      )}
                    </div>

                    {/* Created */}
                    <div className="sm:col-span-3 text-gray-700 text-sm">
                      {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                    </div>

                    {/* Actions */}
                    <div className="sm:col-span-2 flex sm:justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={savingEdit}
                            onClick={saveEdit}
                          >
                            {savingEdit ? 'Saving…' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMembers(d)}
                          >
                            {isOpen ? 'Hide Members' : 'Members'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => beginEdit(d)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDivision(d.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Members drawer */}
                  {isOpen && (
                    <div className="mt-3 rounded-lg border bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">Members</div>
                          <Badge color="blue">{members?.length ?? 0}</Badge>
                        </div>
                      </div>

                      {/* Add member form */}
                      <form
                        onSubmit={addMember}
                        className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2"
                      >
                        <input
                          className="rounded border px-3 py-2 text-sm"
                          placeholder="Email (optional)"
                          value={addMEmail}
                          onChange={(e) => setAddMEmail(e.target.value)}
                        />
                        <input
                          className="rounded border px-3 py-2 text-sm"
                          placeholder="User ID (optional)"
                          value={addMUserId}
                          onChange={(e) => setAddMUserId(e.target.value)}
                        />
                        <div>
                          <Button disabled={addMSubmitting}>
                            {addMSubmitting ? 'Adding…' : 'Add Member'}
                          </Button>
                        </div>
                      </form>

                      {/* Members list */}
                      <div className="mt-4">
                        {membersLoading ? (
                          <div className="p-3 text-gray-600 flex items-center gap-2">
                            <Spinner /> Loading members…
                          </div>
                        ) : !members || members.length === 0 ? (
                          <div className="p-3 text-gray-600">No members yet.</div>
                        ) : (
                          <ul className="divide-y rounded border bg-white">
                            {members.map((m) => (
                              <li key={m.id ?? `${m.divisionId}-${m.userId}`} className="px-4 py-3">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                  <div className="sm:col-span-6 font-medium">
                                    {m.user?.name || m.user?.email || m.userId}
                                  </div>
                                  <div className="sm:col-span-4 text-sm text-gray-700">
                                    {m.user?.email ?? '—'}
                                  </div>
                                  <div className="sm:col-span-2 flex sm:justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeMember(m)}
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