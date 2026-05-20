// app/portal/events/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatEventLocation } from '@/app/lib/eventRecords';
import { getSupabaseBrowser } from '@/app/lib/supabaseBrowser';
import { getEventRegistrationConfig } from '@/app/lib/eventRegistration';
import { canUseOrganizerTools, type ProfileRole } from '@/app/lib/profileCapabilities';

type EventRow = {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  region: string | null;
  date: string | null;   // ISO 'YYYY-MM-DD'
  image: string | null;
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

export default function EventsPageClient() {
  const [supabase] = useState(() => getSupabaseBrowser());
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<ProfileRole>('player');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) Client-side session check (no middleware bounce here)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/portal/login?redirect=%2Fportal%2Fevents');
          return;
        }

        // 2) Role (for organizer tools button)
        const { data: me, error: roleErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (roleErr) throw roleErr;
        if (canUseOrganizerTools(me?.role)) {
          if (alive && me?.role) setRole(me.role as ProfileRole);
        }

        // 3) Load events via your API (keeps DB rules simple)
        const base = window.location.origin;
        const res = await fetch(`${base}/portal/api/events`, { cache: 'no-store' });
        const json = res.ok ? await res.json() : [];
        const list: EventRow[] = Array.isArray(json) ? json : (json.events ?? []);
        if (alive) setEvents(list);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load events');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-red-600 font-semibold">Events error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Events</h1>

        {canUseOrganizerTools(role) && (
          <Link
            href="/portal/org"
            className="rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Organizer Tools
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
              <p className="text-sm text-gray-600">{formatEventLocation(e.city, e.region)}</p>
              <p className="text-sm text-gray-600 mt-1">{fmtDate(e.date)}</p>
              <p className="mt-2 text-sm text-gray-500">
                Registration: {getEventRegistrationConfig({ id: e.id, slug: e.slug }).amountLabel}
              </p>
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
