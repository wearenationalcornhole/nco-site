'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ── Dynamic, client-only panels ─────────────────────────────────────────
const EditDetailsPanel = dynamic(() => import('./components/EditDetailsPanel'), { ssr: false })
const LogoPanel        = dynamic(() => import('./components/LogoPanel'),        { ssr: false })
const PlayersPanel     = dynamic(() => import('./components/PlayersPanel'),     { ssr: false })
const SponsorsPanel    = dynamic(() => import('./components/SponsorsPanel'),    { ssr: false })
const BagsPanel        = dynamic(() => import('./components/BagsPanel'),        { ssr: false })

type EventRecord = {
  id: string
  slug: string | null
  title: string
  date: string | null
  logo_url?: string | null
  image?: string | null
  status?: 'draft' | 'published' | 'archived' | string
  [k: string]: unknown
}

type ToastMsg = { kind: 'success' | 'error' | 'info'; msg: string }

type Props = {
  /** Slug from the route param (always a string in Next App Router) */
  slug: string
  /** Event fetched on the server (optional); improves TTFB */
  initialEvent?: EventRecord | null
}

export default function EventClient({ slug, initialEvent = null }: Props) {
  // Source of truth for event on this page
  const [event, setEvent] = useState<EventRecord | null>(initialEvent)
  const [loading, setLoading] = useState(!initialEvent)
  const [tab, setTab] = useState<'details' | 'players' | 'sponsors' | 'bags'>('details')
  const [toast, setToast] = useState<ToastMsg | null>(null)

  // Ensure we always have a non-null string for LogoPanel
  const slugStr = useMemo(() => (event?.slug ?? slug), [event?.slug, slug])

  // Example client fetch-on-mount if no initialEvent provided
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (initialEvent) return
      try {
        setLoading(true)
        const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(slug)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load event')
        const data = await res.json()
        if (!cancelled) setEvent(data ?? null)
      } catch (e) {
        console.error(e)
        if (!cancelled) setToast({ kind: 'error', msg: 'Failed to load event.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, initialEvent])

  const onSavedLogo = useCallback((url: string | null) => {
    setEvent(prev => prev ? { ...prev, logo_url: url } : prev)
    setToast({ kind: 'success', msg: url ? 'Event logo updated.' : 'Event logo removed.' })
  }, [])

  if (loading && !event) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Spinner size={16} /> Loading event…
      </div>
    )
  }

  if (!event) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-sm text-gray-600">Event not found.</p>
        <div className="mt-3">
          <Link href="/portal">Back to portal</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            {event.date && <Badge>{new Date(event.date).toLocaleDateString()}</Badge>}
            {event.status && <Badge color="gray">{event.status}</Badge>}
            <Badge color="gray">/{slugStr}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setTab('details')} variant={tab === 'details' ? 'primary' : 'ghost'}>Details</Button>
          <Button onClick={() => setTab('players')} variant={tab === 'players' ? 'primary' : 'ghost'}>Players</Button>
          <Button onClick={() => setTab('sponsors')} variant={tab === 'sponsors' ? 'primary' : 'ghost'}>Sponsors</Button>
          <Button onClick={() => setTab('bags')} variant={tab === 'bags' ? 'primary' : 'ghost'}>Demo Bags</Button>
        </div>
      </div>

      {/* Panels */}
      {tab === 'details' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Edit core details */}
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Event Details</h3>
            <EditDetailsPanel event={event} onSaved={(updated) => setEvent(updated)} onToast={setToast} />
          </div>

          {/* Right: Event Logo (single source of truth) */}
          <div className="rounded-xl border p-4">
            <LogoPanel
              slug={slugStr}
              onSaved={onSavedLogo}
            />
          </div>
        </div>
      )}

      {tab === 'players'   && <PlayersPanel   eventId={event.id} onToast={setToast} />}
      {tab === 'sponsors'  && <SponsorsPanel  event={event} onToast={setToast} />}
      {tab === 'bags'      && <BagsPanel      event={event} onToast={setToast} />}

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
