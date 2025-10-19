'use client'

import Button from '@/components/ui/Button'
import { useState } from 'react'

export default function RegisterButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false)

  async function onClick() {
    try {
      setLoading(true)
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user-1' }), // TODO: replace with real user
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to register')
      // Optional: toast success
    } catch (e) {
      // Optional: toast error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={onClick} isLoading={loading} size="lg">
      Register
    </Button>
  )
}