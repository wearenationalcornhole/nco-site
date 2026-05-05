'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export default function NewEventPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [city, setCity]   = useState('')
  const [date, setDate]   = useState('') // yyyy-mm-dd
  const [slug, setSlug]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/portal/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          city: city.trim() || null,
          date: date || null,
        }),
      })
      if (!res.ok) {
        const msg = (await res.json())?.error || 'Failed to create event'
        throw new Error(msg)
      }
      const created = await res.json() as { id: string; slug?: string | null }
      // Go to the organizer view for this event
      const s = created.slug || created.id
      router.push(`/portal/org/events/${encodeURIComponent(s)}`)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold">Create Event</h1>
      <p className="text-gray-600 mt-1">
        Add a new event. You can upload a tournament logo and manage sponsors/bags after it’s created.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slug) setSlug(slugify(e.target.value))
            }}
            placeholder="e.g., Regional Open — East"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Slug (optional)
            </label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="regional-east"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used in the URL. Leave blank to auto-generate.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              City (optional)
            </label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Boston, MA"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date (optional)
          </label>
          <input
            type="date"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">Format: YYYY-MM-DD</p>
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Spinner size={16} />} Create Event
          </button>
        </div>
      </form>
    </div>
  )
}