'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'

// Dynamic imports (client-only)
const SponsorsPanel = dynamic(() => import('./components/SponsorsPanel'), { ssr: false })
const BagsPanel = dynamic(() => import('./components/BagsPanel'), { ssr: false })
const LogoPanel = dynamic(() => import('./components/LogoPanel'), { ssr: false })

type Event = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
  logo_url?: string | null   // ← NEW
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
      const ev = await res.json()
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
        <div className="flex items-center gap-3">
          {/* Tiny live preview if logo exists */}
          {event.logo_url && (
            <span className="inline-flex h-10 w-10 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.logo_url} alt="" className="h-full w-full object-contain" />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
            <p className="text-gray-600 text-sm">
              {event.city ?? 'TBD'} • {event.date ?? 'TBD'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvent}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {[
          { id: 'details', label: 'Details' },
          { id: 'sponsors', label: 'Sponsors' },
          { id: 'bags', label: 'Bags' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
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
        <div className="rounded-xl border bg-white p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Event Details</h2>
            <p className="mt-3 text-gray-700">
              Use the tabs above to manage sponsors and bag submissions for this event.
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Event ID</div>
                <div className="font-medium break-all">{event.id}</div>
              </div>
              <div>
                <div className="text-gray-500">Slug</div>
                <div className="font-medium">{event.slug}</div>
              </div>
              <div>
                <div className="text-gray-500">City</div>
                <div className="font-medium">{event.city ?? 'TBD'}</div>
              </div>
            </div>
          </div>

          {/* Tournament Logo (upload + live update) */}
          <div className="pt-6 border-t">
            <h3 className="text-base font-semibold mb-3">Tournament Logo</h3>
            <LogoPanel
              eventId={event.id}
              currentLogoUrl={event.logo_url ?? null}
              onSaved={(url) => {
                // update local state so preview + public page reflect immediately
                setEvent((prev) => (prev ? { ...prev, logo_url: url } as Event : prev))
                setToast({ msg: 'Tournament logo saved', kind: 'success' })
              }}
            />
          </div>
        </div>
      )}

      {tab === 'sponsors' && <SponsorsPanel event={event} onToast={setToast} />}
      {tab === 'bags' && <BagsPanel event={event} onToast={setToast} />}

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