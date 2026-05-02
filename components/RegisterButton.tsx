// app/components/RegisterButton.tsx
'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import type { EventRegistrationMode } from '@/app/lib/eventRegistration'

type Props = {
  eventId: string
  redirectTo?: string
  label?: string
  mode?: EventRegistrationMode
  helperText?: string
}

export default function RegisterButton({
  eventId,
  redirectTo = '/portal/events',
  label = 'Register Free',
  mode = 'free',
  helperText = 'Free online registration is active now. Paid registration will be added later.',
}: Props) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkoutState = searchParams.get('checkout')
  const sessionId = searchParams.get('session_id')

  const onClick = async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push(`/portal/login?redirect=${encodeURIComponent(redirectTo)}`)
        return
      }

      const res =
        mode === 'paid'
          ? await fetch('/api/stripe/event-registration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventId, redirectTo }),
            })
          : await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/register`, {
              method: 'POST',
            })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        const apiError = payload?.error || 'Failed to register'
        if (apiError.toLowerCase().includes('already registered')) {
          setMessage('You are already registered for this event.')
          return
        }
        throw new Error(apiError)
      }

      if (mode === 'paid') {
        const checkoutUrl = payload?.url
        if (!checkoutUrl) throw new Error('Missing checkout URL')
        window.location.assign(checkoutUrl)
        return
      }

      setMessage('Registration confirmed. Online registration is free in this release.')
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={onClick} loading={loading} size="lg">
        {label}
      </Button>
      <p className="text-xs text-gray-500">{helperText}</p>
      {checkoutState === 'success' ? (
        <p className="text-sm text-green-700">
          Payment received. Registration confirmed{sessionId ? ` for checkout session ${sessionId}.` : '.'}
        </p>
      ) : null}
      {checkoutState === 'cancelled' ? (
        <p className="text-sm text-amber-700">
          Checkout was cancelled. You can return to {pathname?.startsWith('/portal') ? 'the portal event page' : 'the event page'} and try again.
        </p>
      ) : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
