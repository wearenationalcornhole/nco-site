'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'

/** ── Dynamic client-only panels (code-split) ───────────────────────── */
const EditDetailsPanel = dynamic(() => import('./components/EditDetailsPanel'), { ssr: false })
const SponsorsPanel    = dynamic(() => import('./components/SponsorsPanel'),    { ssr: false })
const BagsPanel        = dynamic(() => import('./components/BagsPanel'),        { ssr: false })
const LogoPanel        = dynamic(() => import('./components/LogoPanel'),        { ssr: false })

/** ── Types ─────────────────────────────────────────────────────────── */
type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
}

/** ── Utils ─────────────────────────────────────────────────────────── */
function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** ── Main client page ──────────────────────────────────────────────── */
export default function Client({ slug }: { slug: string }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'details' | 'logo' | 'sponsors' | 'bags'>('details')
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load event')
      const data = (await res.json()) as Event
      setEvent(data)
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

  /** ── Loading / Not found ── */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-gray-600 flex items-center gap-2">
        <Spinner /> Loading event…
      </div>
    )
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-800">Event not found</h2>
        <p className="text-gray-600 mt-2">This event may have been moved or deleted.</p>
      </div>
    )
  }

  /** ── Render ── */
  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer · Event</p>
          <h1 className="text-2xl font-semibold text-gray-900">{event.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-700">
            <Badge color="gray">{event.slug ?? event.id}</Badge>
            <Badge color="blue">{fmtDate(event.date)}</Badge>
            <Badge color="gray">{event.city ?? 'TBD'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/portal/events/${event.slug ?? event.id}`}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Public
          </a>
          <button onClick={fetchEvent} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex flex-wrap gap-4">
          {([
            ['details', 'Details'],
            ['logo', 'Tournament Logo'],
            ['sponsors', 'Sponsors'],
            ['bags', 'Bags'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 pb-3 text-sm font-medium border-b-2 transition ${
                tab === key
                  ? 'border-usaRed text-usaBlue'
                  : 'border-transparent text-gray-600 hover:text-usaBlue hover:border-usaBlue/40'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tab === 'details' && (
          <EditDetailsPanel
            event={event}
            onToast={setToast}
            onUpdated={async () => {
              await fetchEvent()
              setToast({ msg: 'Event updated', kind: 'success' })
            }}
          />
        )}

        {tab === 'logo' && (
          <LogoPanel
            event={event}
            onToast={setToast}
            onUpdated={async () => {
              await fetchEvent()
              setToast({ msg: 'Logo updated', kind: 'success' })
            }}
          />
        )}

        {tab === 'sponsors' && (
          <SponsorsPanel
            event={event}
            onToast={setToast}
            onUpdated={async () => {
              await fetchEvent()
            }}
          />
        )}

        {tab === 'bags' && (
          <BagsPanel
            event={event}
            onToast={setToast}
          />
        )}
      </div>

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