import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EventCard from '@/components/EventCard'
import events from '@/app/data/events.json' // <-- uses your new data file
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse upcoming NCO tournaments around the country.',
  alternates: { canonical: '/events' },
  openGraph: { images: ['/opengraph-image.png'] },
  twitter: { images: ['/twitter-image.png'] },
}


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function EventsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <section className="border-b bg-usaBlue text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl sm:text-4xl font-bold">Events</h1>
            <p className="mt-2 text-white/80">Browse upcoming NCO tournaments around the country.</p>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((e) => (
                <EventCard
                  key={`${e.title}-${e.date}`}
                  title={e.title}
                  subtitle={`${e.city} • ${fmtDate(e.date)}`}
                  image={e.image}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}