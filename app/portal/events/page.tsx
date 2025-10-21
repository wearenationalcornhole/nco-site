// app/portal/events/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/app/lib/supabaseServer'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import Button from '@/components/ui/Button'

type EventRow = {
  id: string
  slug: string | null
  title: string
  city?: string | null
  date?: string | null
  image?: string | null
}

type RegistrationRow = {
  id: string
  event_id: string
  user_id: string
  created_at: string | Date | null
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function Page() {
  // 1) Require login
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session || !session.user) {
    redirect('/portal/login?next=/portal/events')
  }

  const userId = session.user.id

  // 2) Load registrations + events (Prisma if available, else devStore)
  const prisma = await getPrisma()

  let regs: RegistrationRow[] = []
  let eventsById = new Map<string, EventRow>()

  if (prisma) {
    regs = (await prisma.registrations.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      // not relying on Prisma relations to keep schema loose
    })) as unknown as RegistrationRow[]

    const eventIds = Array.from(new Set(regs.map((r) => r.event_id)))
    if (eventIds.length) {
      const evs = (await prisma.events.findMany({
        where: { id: { in: eventIds } },
      })) as unknown as EventRow[]
      eventsById = new Map(evs.map((e) => [e.id, e]))
    }
  } else {
    // dev fallback
    regs = devStore
      .getAll<RegistrationRow>('registrations')
      .filter((r) => r.user_id === userId)
      .sort(
        (a, b) =>
          (new Date(b.created_at ?? 0).getTime() || 0) -
          (new Date(a.created_at ?? 0).getTime() || 0),
      )

    const evs = devStore.getAll<EventRow>('events')
    eventsById = new Map(evs.map((e) => [e.id, e]))
  }

  const rows = regs
    .map((r) => ({ reg: r, event: eventsById.get(r.event_id) }))
    .filter((x) => !!x.event) as { reg: RegistrationRow; event: EventRow }[]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Player</p>
        </div>
      </div>

      {/* Title bar */}
      <div className="mt-2 rounded-xl bg-[var(--nco-header-bg,#0A3161)] text-white px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Events</h1>
          <p className="text-white/80 text-sm">
            Events you’re registered for with this account.
          </p>
        </div>
        <Button asChild variant="outline" className="bg-transparent text-white border-white hover:bg-white/10">
          <Link href="/events">Find more events</Link>
        </Button>
      </div>

      {/* List */}
      <section className="mt-6 rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">
          Your registrations
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-gray-600">
            You haven’t registered for any events yet.
            <div className="mt-4">
              <Button asChild>
                <Link href="/events">Browse events</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map(({ reg, event }) => (
              <li key={reg.id} className="px-4 py-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-600">{event.city ?? 'TBD'}</div>
                </div>
                <div className="sm:col-span-3 text-sm text-gray-700">
                  {fmtDate(event.date)}
                </div>
                <div className="sm:col-span-2 flex sm:justify-end">
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/portal/events/${event.slug ?? event.id}`}>View</Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/events/${event.slug ?? event.id}`}>Public</Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}