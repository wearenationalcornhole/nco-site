'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Event = {
  id: string;
  slug: string | null;
  title: string;
  city?: string | null;
  date?: string | null;
  image?: string | null;
};

export default function OrganizerClient() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/portal/login?redirect=%2Fportal%2Forg'); return; }

        const { data: me, error: perr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (perr) throw perr;
        if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
          router.replace('/portal/dashboard'); return;
        }

        const res = await fetch('/portal/api/events', { cache: 'no-store' });
        const json = res.ok ? await res.json() : [];
        const list: Event[] = Array.isArray(json) ? json : (json.events ?? []);
        if (!alive) return;
        setEvents(list);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load organizer dashboard');
      } finally {
        if (alive) setLoading(false);
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

  if (loading) return <main className="p-8">Loading…</main>;
  if (err) {
    return (
      <main className="p-8">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-red-600 font-semibold">Organizer error</p>
          <p className="text-sm mt-1">{err}</p>
        </div>
      </main>
    );
  }

  const top = filtered.slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Organizer</p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-gray-600">Quick view of your events and activity.</p>
        </div>
        <Link
          href="/portal/org/events"
          className="rounded bg-black text-white px-4 py-2 text-sm hover:opacity-90"
        >
          Manage Events
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No events yet. Create your first event from the Events page.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {top.map((e) => (
            <li key={e.id} className="rounded-xl border bg-white p-4">
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-gray-600">{e.city ?? 'TBD'} • {e.date ?? 'TBD'}</div>
              <div className="mt-3 flex gap-2">
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}