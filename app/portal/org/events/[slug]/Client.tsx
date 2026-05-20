'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatEventLocation } from '@/app/lib/eventRecords'
import { getEventRegistrationConfig } from '@/app/lib/eventRegistration'

// ── Dynamic, client-only panels ─────────────────────────────────────────
const EditDetailsPanel = dynamic(() => import('./components/EditDetailsPanel'), { ssr: false })
const LogoPanel        = dynamic(() => import('./components/LogoPanel'),        { ssr: false })
const PlayersPanel     = dynamic(() => import('./components/PlayersPanel'),     { ssr: false })
const SponsorsPanel    = dynamic(() => import('./components/SponsorsPanel'),    { ssr: false })
const BagsPanel        = dynamic(() => import('./components/BagsPanel'),        { ssr: false })
const DivisionsPanel   = dynamic(() => import('./components/DivisionsPanel'),   { ssr: false })

// ── Types ───────────────────────────────────────────────────────────────
type Event = {
  id: string
  slug: string | null
  title: string
  city: string | null
  region: string | null
  country: string | null
  date: string | null
  image: string | null
  logo_url: string | null
}

function normalizeEventRecord(event: Partial<Event> | null): Event | null {
  if (!event?.id || !event.title) return null

  return {
    id: event.id,
    slug: event.slug ?? null,
    title: event.title,
    city: event.city ?? null,
    region: event.region ?? null,
    country: event.country ?? null,
    date: event.date ?? null,
    image: event.image ?? null,
    logo_url: event.logo_url ?? null,
  }
}

// Typed tab config
const TABS = [
  { id: 'details',   label: 'Details' },
  { id: 'players',   label: 'Players' },
  { id: 'divisions', label: 'Divisions' },
  { id: 'sponsors',  label: 'Sponsors' },
  { id: 'bags',      label: 'Bags' },
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
  const router = useRouter()
  const [event, setEvent]   = useState<Event | null>(null)
  const [tab, setTab]       = useState<TabId>('details')
  const [toast, setToast]   = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`)
      if (!res.ok) throw new Error('Failed to fetch event')
      const ev = normalizeEventRecord((await res.json()) as Event)
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
      <div className="p-6">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-800">Event not found</h2>
          <p className="text-gray-500 mt-2">The event may have been deleted or moved.</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/portal/org/events">Back to Events</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const registrationConfig = getEventRegistrationConfig({ id: event.id, slug: event.slug })

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
            <Badge color="gray">{formatEventLocation(event.city, event.region)}</Badge>
            <Badge color="gray">{registrationConfig.amountLabel}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchEvent}>Refresh</Button>
          <Button asChild>
            <Link href={`/events/${event.slug ?? event.id}`}>View Public</Link>
          </Button>
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
      {tab === 'details' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Summary + Edit */}
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
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium">{formatEventLocation(event.city, event.region)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Registration</dt>
                <dd className="font-medium">{registrationConfig.amountLabel}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <EditDetailsPanel
                event={event}
                onSaved={(updated) => {
                  setEvent(normalizeEventRecord(updated))
                  setToast({ msg: 'Event details saved', kind: 'success' })
                  const nextSlug = updated.slug ?? updated.id
                  if (nextSlug !== slug) router.replace(`/portal/org/events/${encodeURIComponent(nextSlug)}`)
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
                slug={event.slug ?? event.id}
                onSaved={(newUrl) => {
                  setEvent((prev) => (prev ? { ...prev, logo_url: newUrl ?? null } : prev))
                  setToast({ msg: newUrl ? 'Logo updated' : 'Logo cleared', kind: 'success' })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'players'   && <PlayersPanel   eventId={event.id} onToast={setToast} />}
      {tab === 'divisions' && <DivisionsPanel eventId={event.id} onToast={setToast} />}
      {tab === 'sponsors'  && <SponsorsPanel  event={event}     onToast={setToast} />}
      {tab === 'bags'      && <BagsPanel      event={event}     onToast={setToast} />}

      {/* Toast notification */}
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
