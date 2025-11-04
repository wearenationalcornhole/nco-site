// app/portal/org/events/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';

type Event = {
  id: string;
  slug: string | null;
  title: string;
  city?: string | null;
  date?: string | null;   // ISO 'YYYY-MM-DD'
  image?: string | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD';
  const [y, m, d] = (iso ?? '').split('-').map(Number);
  const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function OrgEventsPage() {
  // ✅ get the server client and read the session on the server
  const supabase = await getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Not logged in → login with redirect back here
  if (!session) {
    redirect('/portal/login?redirect=%2Fportal%2Forg%2Fevents');
  }

  // Organizer/Admin gate
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
    redirect('/portal/dashboard');
  }

  // Load events (fallback to local JSON if table blocked/empty)
  let events: Event[] = [];
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, title, city, date, image')
    .order('date', { ascending: false });

  if (!error && data) {
    events = data as Event[];
  } else {
    const local = (await import('@/app/data/events.json')).default as Event[];
    events = local;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer · Events</p>
          <h1 className="text-2xl font-semibold">Your Events</h1>
          <p className="mt-1 text-sm text-gray-600">Manage tournaments, sponsors, and bag submissions.</p>
        </div>
        <Link
          href="/portal/org/events/new"
          className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90"
        >
          + Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No events yet. Click “Create Event” to add your first tournament.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((e) => (
            <article key={e.id} className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.image ?? '/images/tournament-1.jpg'}
                  alt={e.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold">{e.title}</h3>
              <p className="text-gray-600">{(e.city ?? 'TBD') + ' • ' + fmtDate(e.date)}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  href={`/portal/org/events/${e.slug ?? e.id}`}
                  className="rounded-full bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90"
                >
                  Manage
                </Link>
                <Link
                  href={`/portal/events/${e.slug ?? e.id}`}
                  className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  View Public
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}