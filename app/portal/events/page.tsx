'use client'
import Link from 'next/link'
import { devStore } from '@/app/lib/devStore'

type Event = { id: string; title: string; slug: string; city?: string; date?: string; image?: string }

export default function EventsDirectory() {
  const events = devStore.getAll<Event>('events')
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Events</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(e => (
          <Link key={e.id} href={`/portal/events/${e.slug}`} className="border rounded-xl bg-white p-4 hover:shadow">
            <div className="aspect-[16/9] rounded bg-neutral-200 mb-3" />
            <div className="font-semibold">{e.title}</div>
            <div className="text-sm text-gray-600">{e.city} · {e.date}</div>
          </Link>
        ))}
      </div>
      {events.length === 0 && <p className="text-gray-600">No events yet. Create one in Organizer.</p>}
    </div>
  )
}