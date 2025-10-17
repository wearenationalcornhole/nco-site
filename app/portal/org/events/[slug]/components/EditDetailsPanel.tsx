'use client'

import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
}

export default function EditDetailsPanel({
  event,
  onSaved,
  onToast,
}: {
  event: Event
  onSaved: (ev: Event) => void
  onToast: (t: { msg: string; kind: 'success' | 'error' }) => void
}) {
  const [title, setTitle] = useState(event.title)
  const [city, setCity] = useState(event.city ?? '')
  const [date, setDate] = useState(event.date ?? '')
  const [image, setImage] = useState(event.image ?? '')
  const [slug, setSlug] = useState(event.slug ?? '')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          city: city.trim() || null,
          date: date.trim() || null, // yyyy-mm-dd
          image: image.trim() || null,
          slug: slug.trim() || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')
      const updated = await res.json()
      onSaved(updated)
      onToast({ msg: 'Event updated', kind: 'success' })
    } catch (err: any) {
      onToast({ msg: err?.message ?? 'Error', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Edit Event Details</h2>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-gray-600">Title</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Slug</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={slug}
            onChange={(e)=>setSlug(e.target.value)}
            placeholder="regional-east"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">City</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={city}
            onChange={(e)=>setCity(e.target.value)}
            placeholder="Boston, MA"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Date (YYYY-MM-DD)</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
            placeholder="2025-11-08"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-gray-600">Hero Image URL</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={image}
            onChange={(e)=>setImage(e.target.value)}
            placeholder="/images/hero-cornhole.webp"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Spinner size={16} />} Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}