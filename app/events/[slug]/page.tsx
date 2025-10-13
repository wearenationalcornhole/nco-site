import Header from '@/components/Header'
import Footer from '@/components/Footer'
import events from '@/app/data/events.json'
import type { Metadata } from 'next'

type EventItem = { title: string; slug: string; city: string; date: string; image: string }

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const all = events as EventItem[]
  const e = all.find(ev => ev.slug === slug)
  if (!e) {
    return {
      title: 'Event Not Found',
      description: 'This event could not be located.',
      alternates: { canonical: `/events/${slug}` },
    }
  }
  return {
    title: e.title,
    description: `${e.city} — ${new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    alternates: { canonical: `/events/${e.slug}` },
    openGraph: { images: [e.image] },
    twitter: { images: [e.image] },
  }
}

export default async function EventDetail(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const event = (events as EventItem[]).find(e => e.slug === slug)

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <h1 className="text-2xl font-bold">Event not found</h1>
            <p className="mt-2 text-gray-600">Please check back soon.</p>
            <a href="/events" className="mt-6 inline-block rounded-full bg-usaRed px-5 py-2 text-white">Back to Events</a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <section className="relative h-64 sm:h-80">
          <img src={event.image} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-end pb-6">
            <div>
              <h1 className="text-white text-3xl sm:text-4xl font-bold">{event.title}</h1>
              <p className="text-white/90">{event.city} • {fmtDate(event.date)}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-xl font-semibold">About this tournament</h2>
          <p className="mt-2 text-gray-700">
            Registration, divisions, payout structure, and schedule will appear here. In Phase 2, this page will connect to the NCO Portal for live registration and brackets.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="/portal/login" className="rounded-full bg-usaRed px-5 py-2 text-white">Register (Portal)</a>
            <a href="/events" className="rounded-full border px-5 py-2">Back to Events</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}