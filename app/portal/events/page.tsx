// app/portal/events/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/app/lib/supabaseServer'
import { getPrisma } from '@/app/lib/safePrisma'

export const runtime = 'nodejs'

export default async function EventsPage() {
  const supabase = await createServerClient() // ✅ FIXED
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session || !session.user) {
    redirect('/portal/login?next=/portal/events')
  }

  const prisma = await getPrisma()
  let events: any[] = []

  if (prisma) {
    events = await prisma.events.findMany({
      orderBy: { date: 'desc' },
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Events</h1>
        <Link
          href="/portal/org/events"
          className="rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90"
        >
          Organizer Console
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-gray-600">No events available yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {e.title}
              </h2>
              <p className="text-sm text-gray-600">{e.city ?? 'TBD'}</p>
              <p className="text-sm text-gray-600 mt-1">{e.date ?? 'TBD'}</p>
              <div className="mt-3">
                <Link
                  href={`/portal/events/${e.slug ?? e.id}`}
                  className="text-usaBlue text-sm font-medium hover:underline"
                >
                  View Event
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}