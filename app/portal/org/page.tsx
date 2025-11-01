// app/portal/org/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Event = {
  id: string;
  slug: string | null;
  title: string;
  city?: string | null;
  date?: string | null;
  image?: string | null;
  createdAt?: string | null;
};

type Registration = {
  id?: string;
  eventId: string;
  userId: string;
  createdAt?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return 'TBD';
  const [y, m, d] = (iso ?? '').split('-').map(Number);
  const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  });
}

export default function OrganizerDashboardPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [regCounts, setRegCounts] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Auth + role gate on the client (no server cookie writes)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/portal/login?redirect=%2Fportal%2Forg');
          return;
        }

        const { data: me, error: perr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (perr) throw perr;
        if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
          router.replace('/portal/dashboard');
          return;
        }

        // Load events via API (no SSR cookie mutation)
        const base = window.location.origin;
        const res = await fetch(`${base}/portal/api/events`, { cache: 'no-store' });
        const json = res.ok ? await res.json() : [];
        const list: Event[] = Array.isArray(json) ? json : (json.events ?? []);
        if (!alive) return;
        setEvents(list);

        // Small batch of reg counts to keep it snappy
        const top = list.slice(0, 10);
        const counts = await Promise.all(
          top.map(async (e) => {
            try {
              const r = await fetch(`${base}/portal/api/events/${encodeURIComponent(e.id)}/registrations`, { cache: 'no-store' });
              if (!r.ok) return 0;
              const rows = (await r.json()) as Registration[];
              return Array.isArray(rows) ? rows.length : 0;
            } catch {
              return 0;
            }
          })
        );
        const map = new Map<string, number>();
        top.forEach((e, i) => map.set(e.id, counts[i]));
        if (!alive) return;
        setRegCounts(map);

        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load organizer dashboard');
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (!e.date) return true;
      const dt = new Date(e.date + 'T00:00:00Z');
      return dt >= now;
    });
  }, [events]);

  const past = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (!e.date) return false;
      const dt = new Date(e.date + 'T00:00:00Z');
      return dt < now;
    });
  }, [events]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return events;
    return events.filter((e) =>
      (e.title ?? '').toLowerCase().includes(term) ||
      (e.city ?? '').toLowerCase().includes(term) ||
      (e.date ?? '').includes(term)
    );
  }, [events, search]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p>Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-red-600 font-semibold">Organizer error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </main>
    );
  }

  const top = filtered.slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer</p>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Quick view of your events and activity.</p>
        </div>
        <div className="flex gap-2">
          {/* Keep your existing CreateEventButton if you have it as a client component */}
          <Link
            href="/portal/org/events"
            className="rounded bg-black text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Manage Events
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4">
        <input
          className="w-full sm:w-96 rounded border px-3 py-2 text-sm"
          placeholder="Search events by name, city, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Metrics */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total Events</div>
          <div className="mt-1 text-3xl font-semibold">{events.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Upcoming</div>
          <div className="mt-1 text-3xl font-semibold">{upcoming.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Past</div>
          <div className="mt-1 text-3xl font-semibold">{past.length}</div>
        </div>
      </section>

      {/* Events table */}
      <section className="mt-8 rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Your Events</h2>
          <Link href="/portal/org/events" className="text-sm text-usaBlue hover:underline">
            View all
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-gray-600">
            No events yet. Create your first event.
          </div>
        ) : (
          <div className="divide-y">
            {top.map((e) => (
              <div key={e.id} className="px-4 py-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <div className="font-medium text-gray-900">{e.title}</div>
                  <div className="text-sm text-gray-600">{e.city ?? 'TBD'}</div>
                </div>
                <div className="sm:col-span-3 text-sm text-gray-700">{fmtDate(e.date)}</div>
                <div className="sm:col-span-1 text-sm text-gray-700 text-right sm:text-left">
                  {(regCounts.get(e.id) ?? 0).toString()}
                </div>
                <div className="sm:col-span-2 flex sm:justify-end">
                  <div className="flex gap-2">
                    <Link
                      href={`/portal/org/events/${e.slug ?? e.id}`}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/portal/events/${e.slug ?? e.id}`}
                      className="rounded bg-usaBlue text-white px-3 py-1 text-sm hover:opacity-90"
                    >
                      Public
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}