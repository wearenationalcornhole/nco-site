'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RegisterButton from '@/app/portal/components/RegisterButton'

type Event = {
  id: string
  slug: string
  title: string
  city?: string
  date?: string
  image?: string
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [tab, setTab] = useState<'overview' | 'sponsors' | 'bags'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/portal/api/events/by-slug/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data)
      } else {
        setEvent(null)
      }
      setLoading(false)
    })()
  }, [slug])

  if (loading) return <p className="p-8">Loading event...</p>
  if (!event) return <p className="p-8 text-red-500">Event not found</p>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{event.title}</h1>
      <p className="text-gray-600">{event.city} {event.city && event.date ? '•' : ''} {event.date}</p>
      {event.image && (
        <img
          src={event.image}
          alt={event.title}
          className="mt-4 rounded-xl shadow-lg w-full max-h-80 object-cover"
        />
      )}

      <div className="mt-8 flex gap-3">
        {(['overview', 'sponsors', 'bags'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full font-semibold ${
              tab === t ? 'bg-usaBlue text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <div>
            <p className="text-gray-700">
              This event is open for registration. Bring your team, represent your club, and play hard.
            </p>
            {/* TEMP user id until real auth */}
            <RegisterButton eventId={event.id} userId="demo-user-1" />
          </div>
        )}
        {tab === 'sponsors' && (
          <div className="text-gray-700">
            <p>Organizers can upload and manage sponsor logos here (coming soon).</p>
          </div>
        )}
        {tab === 'bags' && (
          <div className="text-gray-700">
            <p>Bag approval dashboard coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}