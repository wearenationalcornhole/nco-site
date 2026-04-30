import Link from 'next/link'
import { formatEventDate } from '@/app/lib/formatDate'
import type { EventDivisionRecord, EventRecord } from '@/app/lib/events'
import EventRegistrationCard from '@/components/EventRegistrationCard'

export default function EventDetailContent({
  event,
  divisions,
  backHref,
  backLabel,
  returnPath,
}: {
  event: EventRecord
  divisions: EventDivisionRecord[]
  backHref: string
  backLabel: string
  returnPath: string
}) {
  const venue = event.location?.trim() || event.city || 'Venue to be announced'

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-[#0A3161] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Link href={backHref} className="text-sm font-semibold text-white/80 hover:text-white">
            ← {backLabel}
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#F4D35E]">
            National Cornhole Organization
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            {event.title}
          </h1>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/85">
            <span className="rounded-full border border-white/20 px-4 py-2">
              Date: {formatEventDate(event.date)}
            </span>
            <span className="rounded-full border border-white/20 px-4 py-2">Venue: {venue}</span>
            <span className="rounded-full border border-white/20 px-4 py-2">
              Registration: Free MVP
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="space-y-8">
            <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Event Details</h2>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Title" value={event.title} />
                <Info label="Date" value={formatEventDate(event.date)} />
                <Info label="Venue" value={venue} />
                <Info label="Registration" value="Free registration open" />
              </dl>
              <p className="mt-6 text-sm leading-7 text-slate-600">
                Division-based registration is live now. Paid registration and checkout are
                intentionally deferred until the payment path is implemented.
              </p>
            </section>

            <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                    Divisions
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    Choose where you want to compete.
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {divisions.length} listed
                </span>
              </div>

              {divisions.length === 0 ? (
                <p className="mt-6 text-sm leading-6 text-slate-600">
                  Divisions will be announced soon. You can still register now and update your
                  division later when the organizer publishes them.
                </p>
              ) : (
                <ul className="mt-6 grid gap-4 md:grid-cols-2">
                  {divisions.map((division) => (
                    <li key={division.id} className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-200">
                      <h3 className="text-lg font-bold text-slate-900">{division.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {typeof division.cap === 'number'
                          ? `Capacity: ${division.cap} players`
                          : 'Capacity will be managed by the organizer.'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </article>

          <aside className="space-y-6">
            <EventRegistrationCard
              eventId={event.id}
              divisions={divisions}
              returnPath={returnPath}
            />

            <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                Registration Notes
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>Registrations are free during this MVP phase.</li>
                <li>Signed-in members can pick or update their division.</li>
                <li>Organizers and admins can review registrants inside the portal.</li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-200">
      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  )
}
