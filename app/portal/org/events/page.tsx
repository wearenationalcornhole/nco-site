'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Event = {
  id: string
  slug?: string
  title: string
  city?: string
  date?: string // ISO-like (YYYY-MM-DD) or plain text
  image?: string
}

// UTC-safe formatter that won’t cause hydration mismatches
function fmtDate(iso?: string) {
  if (!iso) return ''
  // Accepts "YYYY-MM-DD" or any Date-parsable string
  const parts = iso.split('-').map(Number)
  const d =
    parts.length >= 3
      ? new Date(Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1))
      : new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function OrgEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/portal/api/events', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load events')
        const data = (await res.json()) as Event[]
        if (mounted) setEvents(data)
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Error loading events')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Events</h1>
        <Link
          href="/portal/org/events/new"
          className="rounded-full bg-usaBlue text-white px-4 py-2 font-semibold hover:opacity-90"
        >
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-gray-600">No events yet. Create your first one.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl bg-white shadow p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">{e.title}</h3>
                <p className="text-gray-600">
                  {e.city ?? 'TBD'}
                  {e.date ? ` • ${fmtDate(e.date)}` : ''}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-3">
                {/* Manage (organizer) */}
                <Link
                  className="rounded-full border px-3 py-1"
                  href={`/portal/org/events/${e.slug ?? e.id}`}
                >
                  Manage
                </Link>
                {/* Public page */}
                <Link
                  className="rounded-full border px-3 py-1"
                  href={`/portal/events/${e.slug ?? e.id}`}
                >
                  View Public
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}