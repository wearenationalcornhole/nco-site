'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
}

export default function EditEventDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [city, setCity] = useState(event.city ?? '')
  const [date, setDate] = useState(event.date ?? '')
  const [image, setImage] = useState(event.image ?? '')
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, city: city || null, date: date || null, image: image || null }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Update failed')
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Edit Event</h3>
            <form onSubmit={save} className="mt-4 grid gap-3">
              <input className="rounded border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
              <input className="rounded border px-3 py-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" />
              <input className="rounded border px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (YYYY-MM-DD, optional)" />
              <input className="rounded border px-3 py-2 text-sm" value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL (optional)" />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-2 text-sm">Cancel</button>
                <button disabled={saving} className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}