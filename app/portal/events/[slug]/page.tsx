// app/portal/events/[slug]/page.tsx
import Link from 'next/link'
import EventDetailContent from '@/components/EventDetailContent'
import { getEventBySlug, getEventDivisions } from '@/app/lib/events'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="mt-2 text-gray-600">We couldn’t find that event. It may have been moved or removed.</p>
        <div className="mt-6">
          <Link href="/portal/events" className="rounded border px-4 py-2 hover:bg-gray-50">
            Back to Events
          </Link>
        </div>
      </div>
      )
  }

  const divisions = await getEventDivisions(event.id)

  return (
    <EventDetailContent
      event={event}
      divisions={divisions}
      backHref="/portal/events"
      backLabel="Back to Portal Events"
      returnPath={`/portal/events/${event.slug ?? event.id}`}
    />
  )
}
