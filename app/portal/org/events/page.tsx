// app/portal/org/events/page.tsx
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

export default function OrgEventsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auth + role gate (client-side), then fetch events via API
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/portal/login?redirect=%2Fportal%2Forg%2Fevents'); return; }

        // 2) Role check (must be organizer or admin)
        const { data: me, error: perr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (perr) throw perr;
        if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
          router.replace('/portal/dashboard'); return;
        }

        // 3) Fetch events via API (no SSR cookies touched)
        const base = window.location.origin;
        const res = await fetch(`${base}/portal/api/events`, { cache: 'no-store' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Failed to load events (${res.status}) ${txt.slice(0, 100)}`);
        }
        const json = await res.json().catch(() => ({}));
        const list: Event[] = Array.isArray(json) ? json : (json.events ?? []);
        if (!alive) return;
        setEvents(list);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load events');
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return events;
    return events.filter((e) =>
      (e.title ?? '').toLowerCase().includes(term) ||
      (e.city ?? '').toLowerCase().includes(term) ||
      (e.date ?? '').includes(term)
    );
  }, [events, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer · Events</p>
          <h1 className="text-2xl font-semibold">Your Events</h1>
          {error ? (
            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              Manage tournaments, sponsors, and bag submissions.
            </p>
          )}
        </div>

        <Link
          href="/portal/org/events/new"
          className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90"
        >
          + Create Event
        </Link>
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

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border bg-white p-6 text-gray-600">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border bg-white p-6 text-gray-600">
            {events.length === 0
              ? 'No events yet. Click “Create Event” to add your first tournament.'
              : 'No matches. Try a different search.'}
          </div>
        ) : (
          filtered.map((e) => (
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
          ))
        )}
      </div>
    </div>
  );
}