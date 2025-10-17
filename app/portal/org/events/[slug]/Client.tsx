'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'

// Client-only panels (code-split)
const EditDetailsPanel = dynamic(() => import('./components/EditDetailsPanel'), { ssr: false })
const LogoPanel = dynamic(() => import('./components/LogoPanel'), { ssr: false })
const SponsorsPanel = dynamic(() => import('./components/SponsorsPanel'), { ssr: false })
const BagsPanel = dynamic(() => import('./components/BagsPanel'), { ssr: false })
const PlayersPanel = dynamic(() => import('./components/PlayersPanel'), { ssr: false })

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
}

export default function Client({ slug }: { slug: string }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [tab, setTab] = useState<'details' | 'sponsors' | 'bags'>('details')
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`)
      if (!res.ok) throw new Error('Failed to fetch event')
      const ev: Event = await res.json()
      setEvent(ev)
    } catch (err) {
      console.error(err)
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-600">
        <Spinner /> <span className="ml-2">Loading event…</span>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-800">Event not found</h2>
        <p className="text-gray-500 mt-2">The event may have been deleted or moved.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer · Event</p>
          <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-700">
            <Badge color="gray">{event.slug ?? event.id}</Badge>
            <Badge color="gray">{event.city ?? 'TBD'}</Badge>
            <Badge color="gray">{event.date ?? 'TBD'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEvent} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
            Refresh
          </button>
          <a
            href={`/portal/events/${event.slug ?? event.id}`}
            className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90"
          >
            View Public
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {([
          { id: 'details', label: 'Details' },
          { id: 'sponsors', label: 'Sponsors' },
          { id: 'bags', label: 'Bags' },
          { id: 'players', label: 'Players' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 border-b-2 -mb-[2px] text-sm font-medium whitespace-nowrap ${
              tab === t.id
                ? 'border-usaBlue text-usaBlue'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'players' && <PlayersPanel event={event} onToast={setToast} />}
      {tab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-white p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold">Edit Event Details</h2>
            <p className="text-sm text-gray-600 mt-1">Update basics like title, city, or date.</p>
            <div className="mt-4">
              <EditDetailsPanel
                event={event}
                onToast={setToast}
                onSaved={(updated) => {
                  // prefer local state update (fast UX); fallback to refetch if panel doesn’t return full event
                  if (updated) setEvent(updated as Event)
                  else fetchEvent()
                  setToast({ msg: 'Event updated', kind: 'success' })
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Tournament Logo</h2>
            <p className="text-sm text-gray-600 mt-1">Upload or replace the tournament logo.</p>
            <div className="mt-4">
              <LogoPanel
  eventId={event.id}
  currentLogoUrl={event.image ?? null}
  onSaved={(url) => {
    // update local event state and toast
    setEvent((prev) => (prev ? { ...prev, image: url ?? null } : prev))
    setToast({ msg: url ? 'Logo updated' : 'Logo removed', kind: 'success' })
  }}
/>
            </div>
          </div>
        </div>
      )}

      {tab === 'sponsors' && <SponsorsPanel event={event} onToast={setToast} />}
      {tab === 'bags' && <BagsPanel event={event} onToast={setToast} />}

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.msg}
          message={toast.msg}
          kind={toast.kind}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}