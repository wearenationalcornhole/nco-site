'use client'

import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import type { EventDivisionRecord } from '@/app/lib/events'

type RegistrationStatus = {
  id: string
  eventId: string
  userId: string
  divisionId: string | null
  status: string | null
  checkedIn: boolean | null
  createdAt: string | null
}

export default function EventRegistrationCard({
  eventId,
  divisions,
  returnPath,
}: {
  eventId: string
  divisions: EventDivisionRecord[]
  returnPath: string
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null)
  const [divisionId, setDivisionId] = useState<string>('')

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const response = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/register`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => ({}))
        if (!alive) return

        setLoggedIn(Boolean(payload?.loggedIn))
        const nextRegistration = (payload?.registration ?? null) as RegistrationStatus | null
        setRegistration(nextRegistration)

        if (nextRegistration?.divisionId) {
          setDivisionId(nextRegistration.divisionId)
        } else if (divisions.length > 0) {
          setDivisionId(divisions[0].id)
        }
      } catch (err: any) {
        if (!alive) return
        setError(err?.message ?? 'Unable to load registration status')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [divisions, eventId])

  const statusLabel = useMemo(() => {
    if (!registration) return loggedIn ? 'Not registered' : 'Sign in required'
    return registration.status ? registration.status : 'Registered'
  }, [loggedIn, registration])

  async function submit() {
    if (saving) return

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisionId: divisionId || null,
        }),
      })

      if (response.status === 401) {
        window.location.href = `/portal/login?redirect=${encodeURIComponent(returnPath)}`
        return
      }

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to register for this event')
      }

      setLoggedIn(true)
      setRegistration(payload.registration as RegistrationStatus)
      setMessage(
        payload.updated ? 'Registration updated.' : 'Free registration confirmed.',
      )
    } catch (err: any) {
      setError(err?.message ?? 'Unable to register for this event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
        Registration Status
      </p>
      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{statusLabel}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Free registration is live for the MVP. Paid registration and checkout are planned for a
        later phase.
      </p>

      {divisions.length > 0 && (
        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">Division</span>
          <select
            value={divisionId}
            onChange={(event) => setDivisionId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
          >
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {typeof division.cap === 'number' ? `${division.name} · Cap ${division.cap}` : division.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {registration?.divisionId && (
        <p className="mt-4 text-sm text-slate-500">
          Current division:{' '}
          <strong>
            {divisions.find((division) => division.id === registration.divisionId)?.name || 'Assigned'}
          </strong>
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}

      <div className="mt-6">
        <Button onClick={submit} loading={loading || saving} size="lg">
          {!loggedIn
            ? 'Sign in to Register'
            : registration
            ? 'Update Registration'
            : 'Register for Free'}
        </Button>
      </div>
    </div>
  )
}
