// app/events/page.tsx
import Link from 'next/link'
import { fetchPublicEvents, formatEventDate, formatEventLocation } from '@/app/lib/publicEvents'

export default async function Page() {
  const events = await fetchPublicEvents()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Events</h1>
        <p className="text-gray-600 mt-1">
          Explore upcoming tournaments and local gatherings. Sign in when you are ready to register.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No events yet. Please check back soon.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl border bg-white overflow-hidden">
              <Link href={`/events/${e.slug ?? e.id}`} className="block">
                {e.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Event artwork can come from organizer-managed remote URLs outside configured Next image hosts. */}
                  <img
                    src={e.image}
                    alt=""
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                  </>
                ) : (
                  <div className="w-full h-40 bg-gray-100" />
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-gray-900 truncate">{e.title}</h2>
                  <div className="mt-1 text-sm text-gray-600">
                    {formatEventLocation(e.city, e.region)} • {formatEventDate(e.date)}
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    Free online registration is available in the current release.
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
