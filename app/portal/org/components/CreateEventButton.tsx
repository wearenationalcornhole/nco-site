'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function CreateEventButton() {
  const [loading, setLoading] = useState(false)

  async function create() {
    setLoading(true)
    try {
      const payload = {
        title: 'Untitled Event',
        slug: `event-${Date.now()}`,
        city: null,
        date: null,
        image: null,
      }
      const res = await fetch('/portal/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Create failed')
      const evt = await res.json()
      window.location.href = `/portal/org/events/${evt.slug ?? evt.id}`
    } catch (_e) {
      // Optional: toast error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="accent" onClick={create} isLoading={loading}>
      Create Event
    </Button>
  )
}