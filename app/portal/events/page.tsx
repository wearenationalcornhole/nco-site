// app/portal/events/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';

type Role = 'organizer' | 'player' | 'admin';

type EventRow = {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  date: string | null; // ISO 'YYYY-MM-DD'
  image: string | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function EventsPage() {
  // ✅ MUST await the server client, since getSupabaseServer() returns a Promise<SupabaseClient>
  const supabase = await getSupabaseServer();

  // Session required
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fevents');
  }

  // Role (for showing Organizer Console link)
  let role: Role = 'player';
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (p?.role === 'organizer' || p?.role === 'admin') role = p.role as Role;

  // Fetch events (fallback to local JSON)
  let events: EventRow[] = [];
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, title, city, date, image')
    .order('date', { ascending: false });

  if (!error && data) {
    events = data as EventRow[];
  } else {
    const local = (await import('@/app/data/events.json')).default as EventRow[];
    events = local;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Events</h1>

        {(role === 'organizer' || role === 'admin') && (
          <Link
            href="/portal/org"
            className="rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Organizer Console
          </Link>
        )}
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
              <h2 className="text-lg font-semibold text-gray-900">{e.title}</h2>
              <p className="text-sm text-gray-600">{e.city ?? 'TBD'}</p>
              <p className="text-sm text-gray-600 mt-1">{fmtDate(e.date)}</p>
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
  );
}