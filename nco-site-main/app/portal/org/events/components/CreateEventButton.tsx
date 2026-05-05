'use client'

import { useState } from 'react'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export default function CreateEventButton() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')  // YYYY-MM-DD
  const [image, setImage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        slug: slugify(title),
        city: city.trim() || undefined,
        date: date || undefined,
        image: image.trim() || undefined,
      }
      const res = await fetch('/portal/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = (await res.json())?.error || 'Failed to create event'
        throw new Error(msg)
      }
      const event = await res.json()
      // Send organizer to the new event’s organizer view
      location.href = `/portal/org/events/${encodeURIComponent(event.slug ?? event.id)}`
    } catch (err: any) {
      setError(err?.message ?? 'Error creating event')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90"
      >
        Create Event
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Event</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-gray-700">Title *</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded border px-3 py-2"
                  placeholder="e.g., Regional Open — East"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-gray-700">City</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded border px-3 py-2"
                    placeholder="e.g., Boston, MA"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-gray-700">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded border px-3 py-2"
                  />
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-gray-700">Hero Image URL (optional)</span>
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="rounded border px-3 py-2"
                  placeholder="https://…"
                />
              </label>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="rounded bg-usaBlue text-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  {busy ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}