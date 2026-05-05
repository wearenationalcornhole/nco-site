'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function CreateEventButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function create() {
    try {
      setLoading(true)
      const res = await fetch('/portal/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Event',
          // optional: seed some defaults if your API accepts them
          // city: null, date: null, image: null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create event')

      const e = await res.json()
      const id = e?.id ?? e?.event?.id
      const slug = e?.slug ?? e?.event?.slug
      const target = `/portal/org/events/${slug || id}`
      router.push(target)
    } catch (err) {
      console.error(err)
      alert('Could not create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="primary" onClick={create} loading={loading} className={className}>
      Create Event
    </Button>
  )
}