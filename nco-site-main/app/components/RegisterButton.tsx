'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function RegisterButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/register`, {
        method: 'POST',
      })

      if (res.status === 401) {
        // Not signed in → send to login and bounce back here
        const next = encodeURIComponent(window.location.pathname)
        window.location.href = `/portal/login?next=${next}`
        return
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? 'Registration failed')
      }

      // success
      alert('You are registered for this event!')
    } catch (err: any) {
      alert(err?.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={onClick} loading={loading} size="lg">
      Register
    </Button>
  )
}