'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'

// ── Dynamic, client-only panels ─────────────────────────────────────────
const InsightsPanel  = dynamic(() => import('./components/InsightsPanel'),  { ssr: false })
const EditDetailsPanel = dynamic(() => import('./components/EditDetailsPanel'), { ssr: false })
const LogoPanel        = dynamic(() => import('./components/LogoPanel'),        { ssr: false })
const PlayersPanel     = dynamic(() => import('./components/PlayersPanel'),     { ssr: false })
const SponsorsPanel    = dynamic(() => import('./components/SponsorsPanel'),    { ssr: false })
const BagsPanel        = dynamic(() => import('./components/BagsPanel'),        { ssr: false })

// ── Types ───────────────────────────────────────────────────────────────
type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  logo_url?: string | null
}

// Tabs configuration (add Insights)
const TABS = [
  { id: 'insights', label: 'Insights' },
  { id: 'details',  label: 'Details'  },
  { id: 'players',  label: 'Players'  },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'bags',     label: 'Bags'     },
] as const
type TabId = typeof TABS[number]['id']

// ── Helpers ─────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// ── Component ───────────────────────────────────────────────────────────
export default function Client({ slug }: { slug: string }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [tab, setTab] = useState<TabId>('insights')
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`)
      if (!res.ok) throw new Error('Failed to fetch event')
      const ev = (await res.json()) as Event
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
        <Spinner /> Loading event…
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
            <Badge color="blue">{fmtDate(event.date)}</Badge>
            <Badge color="gray">{event.city ?? 'TBD'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEvent} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {TABS.map((t) => (
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
      {tab === 'insights' && <InsightsPanel eventId={event.id} />}
      {tab === 'details' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold">Event Details</h2>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Title</dt>
                <dd className="font-medium">{event.title}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Slug</dt>
                <dd className="font-medium">{event.slug ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">{fmtDate(event.date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">City</dt>
                <dd className="font-medium">{event.city ?? 'TBD'}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <EditDetailsPanel
                event={event}
                onSaved={(updated) => {
                  setEvent(updated)
                  setToast({ msg: 'Event details saved', kind: 'success' })
                }}
                onToast={setToast}
              />
            </div>
          </div>

          {/* Tournament Logo */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-700">Tournament Logo</h3>
            <div className="mt-3">
              <LogoPanel
                eventId={event.id}
                currentLogoUrl={event.logo_url ?? null}
                onSaved={(newUrl) => {
                  setEvent((prev) => (prev ? { ...prev, logo_url: newUrl ?? null } : prev))
                  setToast({ msg: newUrl ? 'Logo updated' : 'Logo cleared', kind: 'success' })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'players' && <PlayersPanel eventId={event.id} onToast={setToast} />}
      {tab === 'sponsors' && <SponsorsPanel event={event} onToast={setToast} />}
      {tab === 'bags' && <BagsPanel event={event} onToast={setToast} />}

      {/* Toast */}
      {toast && (
        <Toast key={toast.msg} message={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />
      )}
    </div>
  )
}