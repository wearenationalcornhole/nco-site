'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import { slugifyEventTitle } from '@/app/lib/eventRecords'

type Event = {
  id: string
  slug: string | null
  title: string
  city: string | null
  date: string | null
  image: string | null
  logo_url?: string | null
}

export default function EditDetailsPanel({
  event,
  onSaved,
  onToast,
}: {
  event: Event
  onSaved: (e: Event) => void
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [title, setTitle] = useState(event.title)
  const [slug, setSlug] = useState(event.slug ?? '')
  const [city, setCity] = useState(event.city ?? '')
  const [date, setDate] = useState(event.date ?? '')
  const [imageUrl, setImageUrl] = useState(event.image ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setTitle(event.title)
    setSlug(event.slug ?? '')
    setCity(event.city ?? '')
    setDate(event.date ?? '')
    setImageUrl(event.image ?? '')
    setFile(null)
  }, [event.id, event.title, event.slug, event.city, event.date, event.image])

  const hasChanges = useMemo(() => {
    return (
      title !== event.title ||
      (slug || null) !== (event.slug ?? null) ||
      (city || null) !== (event.city ?? null) ||
      (date || null) !== (event.date ?? null) ||
      (imageUrl || null) !== (event.image ?? null) ||
      !!file
    )
  }, [title, slug, city, date, imageUrl, file, event])

  async function uploadToSupabase(file: File): Promise<string> {
    setUploading(true)
    try {
      const { supabase } = await import('@/app/lib/supabaseClient')

      // bucket: we reuse the existing "sponsor-logos" bucket to avoid new setup
      // path: event/<slug-or-id>/logo-<timestamp>.<ext>
      const safeSlug = (event.slug || event.id).replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const fname = `logo-${Date.now()}.${ext}`
      const path = `event/${safeSlug}/${fname}`

      const { error } = await supabase.storage
        .from('sponsor-logos')
        .upload(path, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || `image/${ext}`,
        })
      if (error) throw error

      const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(path)
      return data.publicUrl
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let finalImage = imageUrl || undefined
      if (file) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Please choose a valid image file')
        }
        finalImage = await uploadToSupabase(file)
        setImageUrl(finalImage || '')
        setFile(null)
      }

      const res = await fetch(`/portal/api/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || slugifyEventTitle(title),
          city: city.trim() || null,
          date: date.trim() || null,
          image: finalImage ?? null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to save')
      const updated = (await res.json()) as Event
      onSaved(updated)
      onToast({ msg: 'Event updated', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Save failed', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Event Details</h2>
      <p className="mt-1 text-sm text-gray-600">
        Update the core details and upload a tournament logo (optional).
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4">
        {/* Title */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Title</span>
          <input
            className="rounded border px-3 py-2 text-sm"
            value={title}
            onChange={(e) => {
              const nextTitle = e.target.value
              setTitle(nextTitle)
              if (!slug || slug === slugifyEventTitle(title)) {
                setSlug(slugifyEventTitle(nextTitle))
              }
            }}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Slug</span>
          <input
            className="rounded border px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(slugifyEventTitle(e.target.value))}
            placeholder="event-slug"
          />
        </label>

        {/* City / Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">City</span>
            <input
              className="rounded border px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Nashville, TN"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Date</span>
            <input
              className="rounded border px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>
        </div>

        {/* Image URL */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Hero Image URL (optional)</span>
          <input
            className="rounded border px-3 py-2 text-sm"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>

        {/* Or upload */}
        <div className="grid gap-2">
          <span className="text-sm text-gray-600">Or upload a hero image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2"
          />
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Spinner size={16} /> Uploading…
            </div>
          )}
        </div>

        {/* Preview */}
        {(imageUrl || file) && (
          <div className="mt-2 flex items-center gap-3">
            <div className="h-16 w-24 rounded bg-gray-100 overflow-hidden">
              {file ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Required for local editor preview/blob URL rendering before upload. */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </>
              ) : imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Organizer-managed hero image URLs may point to arbitrary remote hosts. */}
                  <img src={imageUrl} alt="Tournament hero" className="h-full w-full object-contain" />
                </>
              ) : null}
            </div>
            <span className="text-xs text-gray-500">Preview</span>
          </div>
        )}

        <div className="pt-2">
          <button
            disabled={!hasChanges || saving || uploading}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Spinner size={16} />} Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
