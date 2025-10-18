'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  className?: string
  onCreated?: (evt: { id: string; slug: string; title: string }) => void
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function CreateEventButton({ className, onCreated }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('') // yyyy-mm-dd
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle('')
    setCity('')
    setDate('')
    setSlug('')
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }

    const finalSlug = (slug || slugify(trimmedTitle) || 'event')
    setSaving(true)
    try {
      const res = await fetch('/portal/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          slug: finalSlug,
          city: city.trim() || undefined,
          date: date || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create event')

      // json should contain at least: id, slug, title
      const evt = { id: json.id as string, slug: json.slug as string, title: json.title as string }
      onCreated?.(evt)

      // Go straight to the event management page
      router.push(`/portal/org/events/${evt.slug}`)
      setOpen(false)
      reset()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-usaBlue text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
      >
        + Create Event
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold">Create New Event</h3>
              <button
                onClick={() => { setOpen(false); reset() }}
                className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    // if user hasn't touched slug manually, keep it in sync
                    if (!slug) setSlug(slugify(e.target.value))
                  }}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  placeholder="e.g., Regional Open — East"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    placeholder="Boston, MA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  placeholder="regional-open-east"
                />
                <p className="mt-1 text-xs text-gray-500">Used in the URL: /events/&lt;slug&gt;</p>
              </div>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset() }}
                  className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="rounded bg-usaRed text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Creating…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}