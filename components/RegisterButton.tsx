// app/components/RegisterButton.tsx
'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

type Props = {
  eventId: string
  redirectTo?: string
  label?: string
}

export default function RegisterButton({
  eventId,
  redirectTo = '/portal/events',
  label = 'Register Free',
}: Props) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/register`, {
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
      <p className="text-xs text-gray-500">
        Free online registration is active now. Paid registration will be added later.
      </p>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
