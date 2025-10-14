'use client'
import { useParams } from 'next/navigation'
import { devStore } from '@/app/lib/devStore'

type Event = { id: string; title: string; slug: string; city?: string; date?: string; image?: string }

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const events = devStore.getAll<Event>('events')
  const event = events.find(e => e.slug === slug)

  if (!event) {
    return <div className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-xl font-bold">Event not found.</h1></div>
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="aspect-[21/9] rounded-xl bg-neutral-200 mb-4" />
      <h1 className="text-3xl font-bold">{event.title}</h1>
      <p className="text-gray-600">{event.city} · {event.date}</p>
      <button className="mt-4 rounded-full bg-black text-white px-4 py-2">Register (mock)</button>
    </div>
  )
}