'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

type Event = {
  id: string
  slug: string | null
  title: string
}

type BagRow = {
  id: string
  event_id: string
  name: string
  image_url?: string | null
  status: 'Pending' | 'Approved' | 'Rejected'
  notes?: string | null
  created_at?: string | null
}

export default function BagsPanel({
  event,
  onToast,
}: {
  event: Event
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [rows, setRows] = useState<BagRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageURL, setImageURL] = useState('') // allow direct URL paste (optional)
  const eventId = event.id

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/portal/api/events/${encodeURIComponent(eventId)}/bags`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((payload) => {
        if (!alive) return
        const rows = (payload?.rows ?? []) as BagRow[]
        setRows(rows)
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
      (r) =>
        !term ||
        r.name.toLowerCase().includes(term) ||
        (r.status ?? '').toLowerCase().includes(term) ||
        (r.notes ?? '').toLowerCase().includes(term)
    )
  }, [rows, q])

  async function uploadToSupabase(file: File): Promise<string> {
    const { supabase } = await import('@/app/lib/supabaseClient')
    const safeSlug = (event.slug || event.id).replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    const fname = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]+/gi, '-')}`
    const path = `event/${safeSlug}/bags/${fname}`
    const { error } = await supabase.storage
      .from('sponsor-logos') // reuse the same bucket; rename later if you make a dedicated one
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || 'image/png',
      })
    if (error) throw error
    const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function addSubmission(e: React.FormEvent) {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) {
      onToast({ msg: 'Bag name is required', kind: 'error' })
      return
    }
    setAdding(true)
    try {
      let finalImageUrl: string | undefined
      if (file) {
        if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
        finalImageUrl = await uploadToSupabase(file)
      } else if (imageURL.trim()) {
        finalImageUrl = imageURL.trim()
      }

      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/bags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nm,
          image_url: finalImageUrl,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to create submission')
      const created = (await res.json()) as BagRow
      setRows((prev) => [created, ...(prev ?? [])])
      setName('')
      setNotes('')
      setFile(null)
      setImageURL('')
      onToast({ msg: 'Bag submission created', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error creating submission', kind: 'error' })
    } finally {
      setAdding(false)
    }
  }

  async function setStatus(id: string, status: BagRow['status']) {
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/bags/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update status')
      const updated = (await res.json()) as BagRow
      setRows((prev) => prev?.map((r) => (r.id === id ? updated : r)) ?? [])
      const msg = status === 'Approved' ? 'Bag approved — sent to production' : status === 'Rejected' ? 'Bag rejected' : `Marked as ${status}`
      onToast({ msg, kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Update failed', kind: 'error' })
    }
  }
  const approve = (id: string) => setStatus(id, 'Approved')
  const reject  = (id: string) => setStatus(id, 'Rejected')

  async function remove(id: string) {
    try {
      const res = await fetch(
        `/portal/api/events/${encodeURIComponent(eventId)}/bags/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to delete')
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? [])
      onToast({ msg: 'Deleted submission', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Delete failed', kind: 'error' })
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Bags</h2>
          <Badge color="blue">{rows?.length ?? 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search name / status / notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-64 rounded border px-3 py-2 text-sm"
            aria-label="Search bag submissions"
          />
        </div>
      </div>

      {/* Create */}
      <form onSubmit={addSubmission} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Bag name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Image URL (optional if uploading)"
          value={imageURL}
          onChange={(e) => setImageURL(e.target.value)}
        />
        <label className="md:col-span-2">
          <span className="sr-only">Upload image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2"
          />
        </label>
        <div className="md:col-span-1">
          <button
            disabled={adding}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {adding && <Spinner size={16} />} Add Submission
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Bag</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600 flex items-center gap-2">
            <Spinner /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-600">No bag submissions yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((b) => (
              <li key={b.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-12 w-16 rounded bg-gray-100 overflow-hidden">
                      {b.image_url ? (
                        <img src={b.image_url} alt={b.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-content-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{b.name}</div>
                      {b.notes ? <div className="text-xs text-gray-500">{b.notes}</div> : null}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Badge
                      color={b.status === 'Approved' ? 'green' : b.status === 'Rejected' ? 'red' : 'gray'}
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">
                    {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => approve(b.id)}
                      className="rounded bg-usaBlue text-white px-3 py-1 text-sm hover:opacity-90"
                      title="Approve"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(b.id)}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      title="Reject"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => remove(b.id)}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      title="Delete"
                    >
                      Delete
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