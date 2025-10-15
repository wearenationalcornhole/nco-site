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

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y,m,d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1)-1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone:'UTC' })
}

export default function OrgEventsPage() {
  const [data, setData] = useState<Event[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'createdAt'|'date'|'title'>('date')
  const [dir, setDir] = useState<'asc'|'desc'>('asc')
  const [toast, setToast] = useState<{msg:string; kind:'success'|'error'}|null>(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch('/portal/api/events')
      .then(r => r.json())
      .then((rows) => { if(!alive) return; setData(rows); setLoading(false) })
      .catch(() => { if(!alive) return; setData([]); setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let rows = (data ?? []).filter(e =>
      !term ||
      e.title.toLowerCase().includes(term) ||
      (e.city ?? '').toLowerCase().includes(term) ||
      (e.slug ?? '').toLowerCase().includes(term)
    )
    rows.sort((a,b) => {
      const A = (sort==='title' ? (a.title||'') : sort==='date' ? (a.date||'') : (a.createdAt||''))
      const B = (sort==='title' ? (b.title||'') : sort==='date' ? (b.date||'') : (b.createdAt||''))
      return (A>B ? 1 : A<B ? -1 : 0) * (dir==='asc' ? 1 : -1)
    })
    return rows
  }, [data, q, sort, dir])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Organizer · Events</h1>
        <div className="flex gap-2">
          <input
            aria-label="Search events"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search by title, city, slug…"
            className="w-full sm:w-72 rounded-lg border px-3 py-2"
          />
          <button onClick={()=>setShowNew(true)} className="rounded-lg bg-usaBlue text-white px-3 py-2 hover:opacity-90">
            + New Event
          </button>
        </div>
      </div>

      {/* sort controls */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-gray-600">Sort by</span>
        <select className="rounded border px-2 py-1" value={sort} onChange={e=>setSort(e.target.value as any)}>
          <option value="date">Date</option>
          <option value="title">Title</option>
          <option value="createdAt">Created</option>
        </select>
        <button className="rounded border px-2 py-1" onClick={()=>setDir(d=>d==='asc'?'desc':'asc')} aria-label="Toggle sort direction">
          {dir==='asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* content */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-3 text-gray-600">
            <Spinner /> <span>Loading events…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-600">
            <p className="font-medium">No events yet</p>
            <p className="text-sm mt-1">Create your first tournament to get started.</p>
            <button onClick={()=>setShowNew(true)} className="mt-4 rounded-lg bg-usaBlue text-white px-4 py-2 hover:opacity-90">Create Event</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white">
            {/* table head */}
            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
              <div className="col-span-5">Event</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Location</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {/* rows */}
            <ul className="divide-y">
              {filtered.map((e) => (
                <li key={e.id} className="px-4 py-4">
                  {/* responsive row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="col-span-5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 rounded-lg bg-gray-100 overflow-hidden">
                          {e.image ? (
                            <img src={e.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-content-center text-xs text-gray-400">No image</div>
                          )}
                        </div>
                        <div>
                          <Link href={`/portal/org/events/${e.slug ?? e.id}`} className="font-semibold hover:underline">
                            {e.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                            <Badge color="gray">{e.slug ?? e.id}</Badge>
                            <Badge color="blue">{e.createdAt ? 'Created' : 'Draft'}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-gray-800">{fmtDate(e.date)}</div>
                    <div className="col-span-3 text-sm text-gray-800">{e.city ?? 'TBD'}</div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <Link href={`/portal/events/${e.slug ?? e.id}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">View Public</Link>
                      <Link href={`/portal/org/events/${e.slug ?? e.id}`} className="rounded bg-black text-white px-3 py-1 text-sm hover:opacity-90">Manage</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showNew && (
        <NewEventModal
          onClose={()=>setShowNew(false)}
          onCreated={(evt) => {
            setToast({ msg: 'Event created', kind: 'success' })
            setData((prev)=>[evt, ...(prev ?? [])])
          }}
          onError={(msg)=>setToast({ msg, kind:'error' })}
        />
      )}
      {toast && <Toast message={toast.msg} kind={toast.kind} onDone={()=>setToast(null)} />}
    </div>
  )
}

function NewEventModal({ onClose, onCreated, onError }:{
  onClose: ()=>void
  onCreated: (evt: Event)=>void
  onError: (msg:string)=>void
}) {
  const [title,setTitle]=useState('')
  const [city,setCity]=useState('')
  const [date,setDate]=useState('')
  const [slug,setSlug]=useState('')
  const [saving,setSaving]=useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { onError('Title is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/portal/api/events', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ title, city: city || null, date: date || null, slug: slug || null }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create')
      const created = await res.json()
      onCreated(created)
      onClose()
    } catch (err:any) {
      onError(err?.message ?? 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleCreate} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Create Event</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Title*</span>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded border px-3 py-2" required />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Slug (optional)</span>
            <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="regional-east" className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">City</span>
            <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Boston, MA" className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Date</span>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded border px-3 py-2" />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-4 py-2 hover:opacity-90 disabled:opacity-60">
            {saving && <Spinner size={16}/>} Create
          </button>
        </div>
      </form>
    </div>
  )
}