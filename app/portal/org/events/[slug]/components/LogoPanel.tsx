'use client'

import { useState } from 'react'

export default function LogoPanel({
  eventId,
  currentLogoUrl,
  onSaved,
}: {
  eventId: string
  currentLogoUrl?: string | null
  onSaved?: (url: string | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function uploadToSupabase(file: File): Promise<string> {
    const { supabase } = await import('@/app/lib/supabaseClient')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fname = `logo-${Date.now()}.${ext}`
    const path = `event/${eventId}/${fname}`

    const { error } = await supabase
      .storage
      .from('tournament-logos') // or reuse your existing bucket name
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || `image/${ext}`,
      })
    if (error) throw error

    const { data } = supabase.storage.from('tournament-logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please select an image file')
      const publicUrl = await uploadToSupabase(file)

      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: publicUrl }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')

      setPreview(publicUrl)
      setFile(null)
      onSaved?.(publicUrl)
    } catch (err: any) {
      alert(err?.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeLogo() {
    if (!preview) return
    if (!confirm('Remove the tournament logo?')) return
    setBusy(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: null }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Remove failed')
      setPreview(null)
      setFile(null)
      onSaved?.(null)
    } catch (err: any) {
      alert(err?.message ?? 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-700">Tournament Logo</h3>

      <div className="mt-3 flex items-center gap-4">
        <div className="h-16 w-16 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Tournament logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No logo</span>
          )}
        </div>

        <form onSubmit={handleSave} className="flex flex-col sm:flex-row items-start gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            disabled={!file || busy}
            className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Upload & Save'}
          </button>
          <button
            type="button"
            onClick={removeLogo}
            disabled={!preview || busy}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  )
}