'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'
import EditDetailsPanel from './components/EditDetailsPanel'



// Dynamic imports (client-only)
const EditDetailsPanel = dynamic(() => import('./components/EditDetailsPanel'), { ssr: false })
const SponsorsPanel = dynamic(() => import('./components/SponsorsPanel'), { ssr: false })
const BagsPanel = dynamic(() => import('./components/BagsPanel'), { ssr: false })
const DivisionsPanel = dynamic(() => import('./components/DivisionsPanel'), { ssr: false })

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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
          <p className="text-gray-600 text-sm">
            {event.city ?? 'TBD'} • {event.date ?? 'TBD'}
          </p>
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
	  { id: 'divisions', label: 'Divisions' },
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
        <EditDetailsPanel
          event={event}
          onSaved={(ev) => setEvent(ev)}
          onToast={setToast}
        />
      )}

      {tab === 'sponsors' && <SponsorsPanel event={event} onToast={setToast} />}
      {tab === 'bags' && <BagsPanel event={event} onToast={setToast} />}
      {tab === 'divisions' && <DivisionsPanel event={event} onToast={setToast} />}

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