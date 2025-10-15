'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Toast from '@/components/ui/Toast'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  createdAt?: string
}

type Registration = {
  id?: string
  eventId: string
  userId: string
  createdAt?: string
  user?: { id: string; email?: string | null; name?: string | null } | null
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function Client({ slug }: { slug: string }) {
  const [tab, setTab] = useState<'overview' | 'registrations' | 'sponsors' | 'bags'>('overview')
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((e) => { if (!alive) return; setEvent(e); setLoading(false) })
      .catch(() => { if (!alive) return; setEvent(null); setLoading(false) })
    return () => { alive = false }
  }, [slug])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer · Event</p>
          <h1 className="text-2xl font-semibold">
            {loading ? 'Loading…' : event ? event.title : 'Event not found'}
          </h1>
          {!loading && event && (
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-700">
              <Badge color="gray">{event.slug ?? event.id}</Badge>
              <Badge color="blue">{fmtDate(event.date)}</Badge>
              <Badge color="gray">{event.city ?? 'TBD'}</Badge>
            </div>
          )}
        </div>
        {!loading && event && (
          <div className="flex gap-2">
            <CopyLinkButton href={`/portal/events/${event.slug ?? event.id}`} />
            <Link href={`/portal/events/${event.slug ?? event.id}`} className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90">
              View Public
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b">
        <nav className="-mb-px flex flex-wrap gap-4">
          {([
            ['overview', 'Overview'],
            ['registrations', 'Registrations'],
            ['sponsors', 'Sponsors'],
            ['bags', 'Bags'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 pb-3 text-sm font-medium border-b-2 transition ${
                tab === key
                  ? 'border-usaRed text-usaBlue'
                  : 'border-transparent text-gray-600 hover:text-usaBlue hover:border-usaBlue/40'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading && (
          <div className="flex items-center gap-3 text-gray-600">
            <Spinner /> <span>Loading event…</span>
          </div>
        )}
        {!loading && !event && (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-600">
            Event not found.
          </div>
        )}
        {!loading && event && (
          <>
            {tab === 'overview' && <Overview event={event} />}
            {tab === 'registrations' && <RegistrationsTab eventId={event.id} onToast={setToast} />}
            {tab === 'sponsors' && <SponsorsTab event={event} onToast={setToast} />}
            {tab === 'bags' && <BagsTab event={event} onToast={setToast} />}
          </>
        )}
      </div>

      {toast && <Toast message={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────────────────────── */

function Overview({ event }: { event: Event }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-xl border bg-white p-6 lg:col-span-2">
        <h2 className="text-lg font-semibold">Event Summary</h2>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Title</dt>
            <dd className="font-medium">{event.title}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Slug</dt>
            <dd className="font-medium">{event.slug ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Date</dt>
            <dd className="font-medium">{fmtDate(event.date)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">City</dt>
            <dd className="font-medium">{event.city ?? 'TBD'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-700">Quick Actions</h3>
        <div className="mt-3 grid gap-2">
          <a
            href={`/portal/events/${event.slug ?? event.id}`}
            className="rounded-lg bg-usaBlue text-white px-3 py-2 text-sm text-center hover:opacity-90"
          >
            View Public Page
          </a>
        </div>
      </div>
    </div>
  )
}
function RegistrationsTab({ eventId, onToast }: { eventId: string; onToast: (t: { msg: string; kind: 'success' | 'error' }) => void }) {
  const [rows, setRows] = useState<Registration[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [userId, setUserId] = useState('demo-user-1')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`)
      .then((r) => r.json())
      .then((data) => { if (!alive) return; setRows(data); setLoading(false) })
      .catch(() => { if (!alive) return; setRows([]); setLoading(false) })
    return () => { alive = false }
  }, [eventId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => {
      const name = r.user?.name ?? ''
      const email = r.user?.email ?? ''
      return !term || name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || r.userId.toLowerCase().includes(term)
    })
  }, [rows, q])

  function exportCSV() {
    const headers = ['id', 'userId', 'name', 'email', 'createdAt']
    const lines = [headers.join(',')]
    filtered.forEach((r) => {
      lines.push([
        r.id ?? '',
        r.userId ?? '',
        (r.user?.name ?? '').replaceAll(',', ' '),
        (r.user?.email ?? '').replaceAll(',', ' '),
        r.createdAt ?? '',
      ].join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `registrations-${eventId}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  async function addRegistration(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to register')
      const created = await res.json()
      setRows((prev) => [created, ...(prev ?? [])])
      onToast({ msg: 'Registration added', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error', kind: 'error' })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Registrations</h2>
          <Badge color="blue">{rows?.length ?? 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search name, email, userId…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-64 rounded border px-3 py-2 text-sm"
            aria-label="Search registrations"
          />
          <button onClick={exportCSV} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4">
        <form onSubmit={addRegistration} className="flex flex-col sm:flex-row gap-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="user id (e.g., demo-user-1)"
          />
          <button
            disabled={adding}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {adding && <Spinner size={16} />} Add Registration
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-4">User</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-3">Registered</div>
          <div className="col-span-1 text-right">ID</div>
        </div>
        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2"><Spinner /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No registrations yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id ?? `${r.userId}-${r.createdAt}`} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-4 font-medium">{r.user?.name ?? r.userId}</div>
                  <div className="col-span-4 text-gray-700">{r.user?.email ?? '—'}</div>
                  <div className="col-span-3 text-gray-700">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div>
                  <div className="col-span-1 text-right text-xs text-gray-500 truncate">{r.id ?? '—'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
function SponsorsTab(
  { event, onToast }: { event: Event; onToast: (t: { msg: string; kind: 'success' | 'error' }) => void }
) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; url?: string; logo?: string }>>([])
  const [name, setName] = useState(''); const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // lazy import to keep this component tree light
  async function uploadToSupabase(file: File): Promise<string> {
    const { supabase } = await import('@/app/lib/supabaseClient')

    // create a clean path: event/<slug-or-id>/<timestamp>-<sanitized-name>
    const safeSlug = (event.slug || event.id).replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fname = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]+/gi, '-')}`
    const path = `event/${safeSlug}/${fname}`

    const { error } = await supabase
      .storage
      .from('sponsor-logos')
      .upload(path, file, { cacheControl: '31536000', upsert: true, contentType: file.type || `image/${ext}` })

    if (error) throw error

    const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function addSponsor(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return onToast({ msg: 'Sponsor name required', kind: 'error' })
    try {
      setUploading(true)
      let logoUrl: string | undefined
      if (file) {
        // basic client-side guard
        if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
        // upload to Supabase Storage → get public URL
        logoUrl = await uploadToSupabase(file)
      }

      const row = { id: crypto.randomUUID(), name: name.trim(), url: url || undefined, logo: logoUrl }
      setRows((prev) => [row, ...prev])
      setName(''); setUrl(''); setFile(null)
      onToast({ msg: 'Sponsor added', kind: 'success' })

      // TODO: Save this sponsor to your DB via an API route when ready
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Upload failed', kind: 'error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Sponsors</h2>
      <p className="mt-1 text-sm text-gray-600">
        Upload sponsor logos for <span className="font-medium">{event.title}</span>. Files are stored in Supabase Storage.
      </p>

      <form onSubmit={addSponsor} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Sponsor name *"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Sponsor website (optional)"
          value={url}
          onChange={(e)=>setUrl(e.target.value)}
          type="url"
        />
        <label className="block">
          <span className="sr-only">Logo file</span>
          <input
            className="w-full rounded border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="sm:col-span-3">
          <button
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Add Sponsor'}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Sponsor</div>
          <div className="col-span-5">URL</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4 text-gray-600">No sponsors yet.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-10 w-14 rounded bg-gray-100 overflow-hidden">
                      {s.logo
                        ? <img src={s.logo} alt={`${s.name} logo`} className="h-full w-full object-cover" />
                        : <div className="h-full w-full grid place-content-center text-xs text-gray-400">No logo</div>}
                    </div>
                    <div className="font-medium">{s.name}</div>
                  </div>
                  <div className="col-span-5 text-sm text-blue-700 truncate">
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.url}</a> : '—'}
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => setRows(prev => prev.filter(x => x.id !== s.id))}
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

function BagsTab({ event, onToast }: { event: Event; onToast: (t: { msg: string; kind: 'success' | 'error' }) => void }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; status: 'Pending'|'Approved'|'Rejected'; image?: string }>>([
    { id: 'demo-1', name: 'NCO Signature — Red/White/Blue', status: 'Pending', image: '/images/tournament-1.jpg' },
  ])

  function setStatus(id: string, status: 'Approved'|'Rejected') {
    setRows(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    onToast({ msg: `Bag ${status.toLowerCase()}`, kind: 'success' })
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Bags Review</h2>
      <p className="mt-1 text-sm text-gray-600">Review demo bags submitted for <span className="font-medium">{event.title}</span>. (Local state for now — API soon.)</p>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((b) => (
          <li key={b.id} className="rounded-xl border overflow-hidden bg-white">
            <div className="aspect-[16/9] bg-gray-100">
              {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{b.name}</div>
                <Badge color={b.status === 'Approved' ? 'green' : b.status === 'Rejected' ? 'red' : 'gray'}>{b.status}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={()=>setStatus(b.id, 'Approved')} className="rounded bg-usaBlue text-white px-3 py-1 text-sm hover:opacity-90">Approve</button>
                <button onClick={()=>setStatus(b.id, 'Rejected')} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Reject</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CopyLinkButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        const url = location.origin + href
        navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) })
      }}
      className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
      aria-live="polite"
    >
      {copied ? 'Copied!' : 'Copy Public Link'}
    </button>
  )
}