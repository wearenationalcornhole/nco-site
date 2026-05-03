'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

type Division = {
  id: string
  event_id: string
  name: string
  cap?: number | null
  created_at?: string | null
}

type Row = {
  id?: string
  eventId: string
  userId: string
  divisionId?: string | null
  createdAt?: string
  paymentStatus?: string | null
  paymentAmountCents?: number | null
  paymentCurrency?: string | null
  user?: { id: string; email?: string | null; name?: string | null } | null
}

type AuditEntry = {
  id: string
  action: string
  actorName: string
  actorRole: string | null
  statusBefore: string | null
  statusAfter: string | null
  note: string | null
  createdAt: string | null
}

function formatMoney(amountCents?: number | null, currency?: string | null) {
  if (amountCents == null) return null

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency ?? 'usd').toUpperCase(),
    }).format(amountCents / 100)
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`
  }
}

function renderPaymentSummary(row: Row) {
  if (!row.paymentStatus) return 'Free / manual'

  const money = formatMoney(row.paymentAmountCents, row.paymentCurrency)
  const status = row.paymentStatus.replace(/_/g, ' ')
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return money ? `${label} · ${money}` : label
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
  const [paymentActionRowId, setPaymentActionRowId] = useState<string | null>(null)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])

  // divisions
  const [divisions, setDivisions] = useState<Division[]>([])
  const [divisionId, setDivisionId] = useState<string>('')

  // Load players
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

  // Load divisions
  useEffect(() => {
    let alive = true
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/divisions`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data: Division[]) => {
        if (!alive) return
        setDivisions(data || [])
        // default to the first division if present
        if (data?.length && !divisionId) setDivisionId(data[0].id)
      })
      .catch(() => {
        if (!alive) return
        setDivisions([])
      })
    return () => {
      alive = false
    }
  }, [eventId])

  useEffect(() => {
    let alive = true
    fetch(`/portal/api/payments/audit?eventId=${encodeURIComponent(eventId)}&limit=8`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data: AuditEntry[]) => {
        if (!alive) return
        setAuditEntries(data || [])
      })
      .catch(() => {
        if (!alive) return
        setAuditEntries([])
      })
    return () => {
      alive = false
    }
  }, [eventId])

  // counts by division
  const countByDivision = useMemo(() => {
    const map = new Map<string, number>()
    ;(rows ?? []).forEach((r) => {
      const key = r.divisionId ?? '__none__'
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return map
  }, [rows])

  const selectedDivision = divisions.find((d) => d.id === divisionId)
  const selectedCount = selectedDivision ? (countByDivision.get(selectedDivision.id) ?? 0) : 0
  const selectedCap = selectedDivision?.cap ?? null
  const remaining =
    typeof selectedCap === 'number' && selectedCap >= 0 ? Math.max(0, selectedCap - selectedCount) : null

  // Search filter
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

  const paymentSummary = useMemo(() => {
    return (rows ?? []).reduce(
      (summary, row) => {
        if (!row.paymentStatus) {
          summary.freeManualCount += 1
          return summary
        }

        const normalized = row.paymentStatus.toLowerCase()
        if (normalized === 'paid') {
          summary.paidCount += 1
          summary.revenueCents += row.paymentAmountCents ?? 0
          return summary
        }

        summary.pendingCount += 1
        return summary
      },
      {
        paidCount: 0,
        pendingCount: 0,
        freeManualCount: 0,
        revenueCents: 0,
      },
    )
  }, [rows])

  // Add player
  async function addByEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      onToast({ msg: 'Email is required', kind: 'error' })
      return
    }
    if (selectedDivision && typeof selectedDivision.cap === 'number' && remaining === 0) {
      onToast({ msg: 'Division is full', kind: 'error' })
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
            divisionId: divisionId || undefined,
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

  // Remove player
  async function removePlayer(row: Row) {
    if (row.paymentStatus?.toLowerCase() === 'paid') {
      onToast({ msg: 'Use Refund for paid registrations so payment history stays accurate.', kind: 'error' })
      return
    }

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

  async function refundAndRemove(row: Row) {
    if (!row.paymentStatus || row.paymentStatus.toLowerCase() !== 'paid') return
    const rowKey = row.id ?? row.userId
    const confirmed = window.confirm(
      `Refund ${row.user?.name || row.user?.email || row.userId} and remove the registration from this event?`,
    )
    if (!confirmed) return

    try {
      setPaymentActionRowId(rowKey)
      const response = await fetch('/portal/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'event_registration',
          id: row.id,
          action: 'refund',
          removeRegistration: true,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Refund failed')

      if (payload?.registrationRemoved) {
        setRows((prev) => (prev ?? []).filter((candidate) => candidate !== row))
      } else {
        setRows((prev) =>
          (prev ?? []).map((candidate) =>
            candidate === row ? { ...candidate, paymentStatus: 'refunded' } : candidate,
          ),
        )
      }

      setAuditEntries((prev) => [
        {
          id: `local-${Date.now()}`,
          action: 'refund',
          actorName: 'Current organizer',
          actorRole: 'organizer',
          statusBefore: row.paymentStatus ?? null,
          statusAfter: 'refunded',
          note: payload?.registrationRemoved
            ? 'Refund issued and registration removed by organizer/admin.'
            : 'Refund issued by organizer/admin.',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 8))

      onToast({ msg: 'Refund submitted', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Refund failed', kind: 'error' })
    } finally {
      setPaymentActionRowId(null)
    }
  }

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
        className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-2"
      >
        <input
          className="rounded border px-3 py-2 text-sm lg:col-span-2"
          placeholder="Email *"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2 text-sm lg:col-span-1"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="rounded border px-3 py-2 text-sm lg:col-span-1"
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
        >
          {divisions.length === 0 && <option value="">No divisions</option>}
          {divisions.map((d) => {
            const taken = countByDivision.get(d.id) ?? 0
            const cap = d.cap ?? null
            const label =
              typeof cap === 'number' && cap >= 0
                ? `${d.name} (${Math.max(0, cap - taken)} left)`
                : d.name
            return (
              <option key={d.id} value={d.id}>
                {label}
              </option>
            )
          })}
        </select>

        <div className="lg:col-span-1">
          <Button disabled={submitting || (selectedDivision && remaining === 0)}>
            {submitting ? 'Adding…' : remaining === 0 ? 'Division Full' : 'Add Player'}
          </Button>
        </div>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Registrations</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{paymentSummary.paidCount}</p>
          <p className="mt-1 text-sm text-slate-600">{formatMoney(paymentSummary.revenueCents, 'usd') ?? '$0.00'} collected</p>
        </div>
        <div className="rounded-lg border bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Payments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{paymentSummary.pendingCount}</p>
          <p className="mt-1 text-sm text-slate-600">Checkout started but not yet settled</p>
        </div>
        <div className="rounded-lg border bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Free / Manual</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{paymentSummary.freeManualCount}</p>
          <p className="mt-1 text-sm text-slate-600">Registrants without a payment record</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Recent Payment Actions</h3>
          <Badge color="blue">{auditEntries.length}</Badge>
        </div>
        {auditEntries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No refund or cancellation actions have been logged for this event yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded border bg-white">
            {auditEntries.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {entry.action} · {entry.actorName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(entry.statusBefore ?? '—')} → {entry.statusAfter ?? '—'}{entry.actorRole ? ` · ${entry.actorRole}` : ''}
                    </p>
                    {entry.note ? <p className="mt-1 text-xs text-slate-500">{entry.note}</p> : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Division</div>
          <div className="col-span-2">Payment</div>
          <div className="col-span-1">Registered</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No players yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => {
              const divLabel =
                divisions.find((d) => d.id === r.divisionId)?.name ?? '—'
              return (
                <li
                  key={r.id ?? `${r.userId}-${r.createdAt}`}
                  className="px-4 py-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="col-span-3 font-medium">{r.user?.name ?? '—'}</div>
                    <div className="col-span-3 text-gray-700">{r.user?.email ?? '—'}</div>
                    <div className="col-span-2 text-gray-700">{divLabel}</div>
                    <div className="col-span-2 text-gray-700">
                      {renderPaymentSummary(r)}
                    </div>
                    <div className="col-span-1 text-gray-700">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </div>
                    <div className="col-span-1 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.id && r.paymentStatus?.toLowerCase() === 'paid' ? (
                          <button
                            onClick={() => refundAndRemove(r)}
                            disabled={paymentActionRowId === (r.id ?? r.userId)}
                            className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                          >
                            {paymentActionRowId === (r.id ?? r.userId) ? '...' : 'Refund'}
                          </button>
                        ) : null}
                        <button
                          onClick={() => removePlayer(r)}
                          disabled={removing === (r.id ?? r.userId)}
                          className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          {removing === (r.id ?? r.userId) ? '...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
