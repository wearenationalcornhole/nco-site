export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { isProfileReadyForPortal } from '@/app/lib/profileCapabilities'

type RegistrationRow = {
  id: string
  status: string | null
  checked_in: boolean | null
  notes: string | null
  created_at: string
  event_id: string
  division_id: string | null
}

type EventRow = {
  id: string
  slug: string | null
  title: string
  city: string | null
  date: string | null
  start_time: string | null
  location: string | null
  image: string | null
}

type DivisionRow = {
  id: string
  event_id: string
  name: string
  fee_cents: number | null
}

export default async function MyRegistrationsPage() {
  const supabase = await getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fmy-registrations')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_profile_complete, first_name, last_name, organization, city, region')
    .eq('id', user.id)
    .maybeSingle()

  if (!isProfileReadyForPortal(profile)) {
    redirect('/portal/onboarding?debug=incomplete_profile')
  }

  const { data: registrations, error: registrationsError } = await supabase
    .from('registrations')
    .select('id,status,checked_in,notes,created_at,event_id,division_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<RegistrationRow[]>()

  const eventIds = Array.from(
    new Set((registrations ?? []).map((registration) => registration.event_id).filter(Boolean))
  )

  const divisionIds = Array.from(
    new Set((registrations ?? []).map((registration) => registration.division_id).filter(Boolean))
  ) as string[]

  const { data: events, error: eventsError } =
    eventIds.length > 0
      ? await supabase
          .from('events')
          .select('id,slug,title,city,date,start_time,location,image')
          .in('id', eventIds)
          .returns<EventRow[]>()
      : { data: [] as EventRow[], error: null }

  const { data: divisions, error: divisionsError } =
    divisionIds.length > 0
      ? await supabase
          .from('event_divisions')
          .select('id,event_id,name,fee_cents')
          .in('id', divisionIds)
          .returns<DivisionRow[]>()
      : { data: [] as DivisionRow[], error: null }

  const loadError = registrationsError || eventsError || divisionsError
  const eventsById = new Map((events ?? []).map((event) => [event.id, event]))
  const divisionsById = new Map((divisions ?? []).map((division) => [division.id, division]))

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Portal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">My registrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Events you have registered for will appear here.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          We could not load your registrations yet. The portal knows you are signed in, but the
          registration history table/query still needs to be wired up.
        </div>
      ) : registrations && registrations.length > 0 ? (
        <div className="space-y-4">
          {registrations.map((registration) => {
            const event = eventsById.get(registration.event_id)
            const division = registration.division_id ? divisionsById.get(registration.division_id) : null
            const title = event?.title || 'Registered event'
            const eventDate = event?.date
            const registrationDate = registration.created_at

            return (
              <article
                key={registration.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
                    {division ? (
                      <p className="mt-1 text-sm text-slate-600">Division: {division.name}</p>
                    ) : null}
                    {event?.location ? (
                      <p className="mt-1 text-sm text-slate-600">{event.location}</p>
                    ) : null}
                    {event?.city ? (
                      <p className="mt-1 text-sm text-slate-600">{event.city}</p>
                    ) : null}
                    {eventDate ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Event date:{' '}
                        {new Date(`${eventDate}T00:00:00`).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    ) : null}
                    {registrationDate ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Registered:{' '}
                        {new Date(registrationDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    ) : null}
                    {event?.slug ? (
                      <a
                        href={`/events/${event.slug}`}
                        className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
                      >
                        View event
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {registration.status || 'registered'}
                    </span>
                    {registration.checked_in ? (
                      <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Checked in
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">No registrations yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Once you register for an event, it will show up here.
          </p>
          <Link
            href="/portal/events"
            className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Browse events
          </Link>
        </div>
      )}
    </main>
  )
}
