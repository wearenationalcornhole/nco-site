// app/components/RegisterButton.tsx
'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

type Props = {
  eventId: string
}

export default function RegisterButton({ eventId }: Props) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user-1' }), // replace with real user id when auth is wired
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'Failed to register')
      }
      // optional: toast / UI feedback here
    } catch (err) {
      console.error(err)
      alert((err as Error).message)
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