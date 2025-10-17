'use client'

import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'

type Props = {
  eventId: string
  currentLogoUrl?: string | null
  onSaved?: (url: string | null) => void
}

export default function LogoPanel({ eventId, currentLogoUrl = null, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)

  async function uploadToSupabase(file: File): Promise<string> {
    const { supabase } = await import('@/app/lib/supabaseClient')
    const safe = eventId.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    const fname = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]+/gi, '-')}`
    const path = `event/${safe}/logo/${fname}`

    const { error } = await supabase.storage
      .from('sponsor-logos') // reuse bucket
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || 'image/png',
      })
    if (error) throw error

    const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    try {
      const url = await uploadToSupabase(file)
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update event')
      setPreview(url)
      onSaved?.(url)
      setFile(null)
    } catch (err) {
      console.error(err)
      onSaved?.(preview ?? null) // no-op notify
    } finally {
      setSubmitting(false)
    }
  }

  async function clearLogo() {
    setSubmitting(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: null }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to update event')
      setPreview(null)
      onSaved?.(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Tournament logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No logo</span>
          )}
        </div>
        {preview && (
          <button
            type="button"
            onClick={clearLogo}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={submitting}
          >
            Remove
          </button>
        )}
      </div>

      <form onSubmit={save} className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2"
        />
        <button
          className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          disabled={submitting || !file}
        >
          {submitting && <Spinner size={16} />} Upload
        </button>
      </form>
    </div>
  )
}