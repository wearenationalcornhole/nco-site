'use client'

import { useEffect, useMemo, useState } from 'react'

type EventLite = { id: string; slug: string | null; title: string }
type Row = { id: string; name: string; url?: string; logo?: string }

export default function SponsorsPanel({
  event,
  onToast,
}: {
  event: EventLite
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/portal/api/event-sponsors?eventId=${encodeURIComponent(event.id)}`, {
          cache: 'no-store',
        })
        const data = res.ok ? await res.json() : []
        if (!alive) return
        setRows(
          (data ?? []).map((l: any) => ({
            id: l.id,
            name: l.company?.name ?? 'Sponsor',
            url: l.company?.website ?? undefined,
            logo: l.company?.logo_url ?? l.company?.logo ?? undefined,
          })),
        )
      } catch {
        if (!alive) return
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [event.id])

  const canSubmit = useMemo(() => name.trim().length > 0 && !uploading, [name, uploading])

  async function sha1OfFile(file: File): Promise<string> {
    const buf = await file.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-1', buf)
    const bytes = Array.from(new Uint8Array(hash))
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  async function uploadToSupabase(eventSlugOrId: string, file: File): Promise<string> {
    const { supabase } = await import('@/app/lib/supabaseClient')
    const safe = eventSlugOrId.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    const fname = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]+/gi, '-')}`
    const path = `event/${safe}/${fname}`

    const { error } = await supabase.storage
      .from('sponsor-logos')
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || 'image/png',
      })
    if (error) throw error

    const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function upsertCompany(payload: {
    name: string
    website?: string
    logo_url?: string
    logo_hash?: string
  }) {
    const res = await fetch('/portal/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to save company')
    return res.json() // { id, name, website, logo_url, ... }
  }

  async function linkCompanyToEvent(eventId: string, companyId: string) {
    const res = await fetch('/portal/api/event-sponsors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, companyId }),
    })
    if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to link sponsor')
    return res.json()
  }

  async function refresh() {
    const res = await fetch(`/portal/api/event-sponsors?eventId=${encodeURIComponent(event.id)}`, { cache: 'no-store' })
    const data = res.ok ? await res.json() : []
    setRows(
      (data ?? []).map((l: any) => ({
        id: l.id,
        name: l.company?.name ?? 'Sponsor',
        url: l.company?.website ?? undefined,
        logo: l.company?.logo_url ?? l.company?.logo ?? undefined,
      })),
    )
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return onToast({ msg: 'Sponsor name required', kind: 'error' })

    try {
      setUploading(true)
      let logoUrl: string | undefined
      let logoHash: string | undefined

      if (file) {
        if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
        const idOrSlug = (event.slug || event.id)!
        ;[logoUrl, logoHash] = await Promise.all([uploadToSupabase(idOrSlug, file), sha1OfFile(file)])
      }

      // 1) Upsert company
      const company = await upsertCompany({
        name: name.trim(),
        website: url || undefined,
        logo_url: logoUrl,
        logo_hash: logoHash,
      })

      // 2) Link to this event
      await linkCompanyToEvent(event.id, company.id)

      // 3) Refresh from API → renders DB-backed rows
      await refresh()

      // 4) Reset form + toast
      setName('')
      setUrl('')
      setFile(null)
      onToast({ msg: 'Sponsor saved', kind: 'success' })
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
        Upload sponsor logos for <span className="font-medium">{event.title}</span>. Files are stored in Supabase
        Storage and linked to this event.
      </p>

      {/* Form */}
      <form onSubmit={onAdd} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Sponsor name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Sponsor website (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
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
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Add Sponsor'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Sponsor</div>
          <div className="col-span-5">URL</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-gray-600">No sponsors yet.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-10 w-14 rounded bg-gray-100 overflow-hidden">
                      {s.logo ? (
                        <img src={s.logo} alt={`${s.name} logo`} className="h-full w-full object-contain" />
                      ) : (
                        <div className="h-full w-full grid place-content-center text-xs text-gray-400">No logo</div>
                      )}
                    </div>
                    <div className="font-medium">{s.name}</div>
                  </div>
                  <div className="col-span-5 text-sm text-blue-700 truncate">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {s.url}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    {/* For now, removal is local-only; add DELETE API later if desired */}
                    <button
                      onClick={() => setRows((prev) => prev.filter((x) => x.id !== s.id))}
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