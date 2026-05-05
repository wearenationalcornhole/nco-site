export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'

type RegistrationRow = {
  id: string
  status: string | null
  created_at: string | null
  event_id: string | null
  events?: {
    title?: string | null
    name?: string | null
    slug?: string | null
    starts_at?: string | null
    start_date?: string | null
    location?: string | null
  } | null
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

  const hasRequiredBasics =
    Boolean(profile?.role) &&
    Boolean(profile?.first_name) &&
    Boolean(profile?.last_name) &&
    Boolean(profile?.city) &&
    Boolean(profile?.region) &&
    (profile?.role !== 'organizer' || Boolean(profile?.organization))

  if (!hasRequiredBasics) {
    redirect('/portal/onboarding?debug=incomplete_profile')
  }

  const { data: registrations, error: registrationsError } = await supabase
    .from('event_registrations')
    .select(
      'id,status,created_at,event_id,events(title,name,slug,starts_at,start_date,location)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<RegistrationRow[]>()

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Portal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">My registrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Events you have registered for will appear here.
        </p>
      </div>

      {registrationsError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          We could not load your registrations yet. The portal knows you are signed in, but the
          registration history table/query still needs to be wired up.
        </div>
      ) : registrations && registrations.length > 0 ? (
        <div className="space-y-4">
          {registrations.map((registration) => {
            const event = registration.events
            const title = event?.title || event?.name || 'Registered event'
            const eventDate = event?.starts_at || event?.start_date

            return (
              <article
                key={registration.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
                    {event?.location ? (
                      <p className="mt-1 text-sm text-slate-600">{event.location}</p>
                    ) : null}
                    {eventDate ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(eventDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {registration.status || 'registered'}
                  </span>
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
          <a
            href="/portal/events"
            className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Browse events
          </a>
        </div>
      )}
    </main>
  )
}
