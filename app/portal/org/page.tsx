'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'organizer' | 'admin';

export default function OrganizerDashboardPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Auth check (client; no cookie writes)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/portal/login?redirect=%2Fportal%2Forg'); return; }

        const { data: me, error: perr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (perr) throw perr;

        if (!me || !(['organizer','admin'] as Role[]).includes(me.role as Role)) {
          router.replace('/portal/dashboard'); return;
        }

        // Load events via API
        const res = await fetch('/portal/api/events', { cache: 'no-store' });
        const json = res.ok ? await res.json() : [];
        const list = Array.isArray(json) ? json : (json.events ?? []);
        if (!alive) return;
        setEvents(list);
        setOk(true);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  if (loading) return <main className="p-8">Loading…</main>;
  if (err) return (
    <main className="p-8">
      <div className="rounded border bg-white p-4">
        <p className="text-red-600 font-semibold">Organizer error</p>
        <p className="text-sm mt-1">{err}</p>
      </div>
    </main>
  );
  if (!ok) return null;

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase text-gray-500">Organizer</p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <Link href="/portal/org/events" className="rounded bg-black text-white px-4 py-2 text-sm hover:opacity-90">
          Manage Events
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded border bg-white p-6 text-gray-600">
          No events yet. Create your first event from the Events page.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.slice(0, 8).map((e:any) => (
            <li key={e.id} className="rounded-xl border bg-white p-4">
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-gray-600">{e.city ?? 'TBD'} • {e.date ?? 'TBD'}</div>
              <div className="mt-3 flex gap-2">
                <Link href={`/portal/org/events/${e.slug ?? e.id}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
                  Manage
                </Link>
                <Link href={`/portal/events/${e.slug ?? e.id}`} className="rounded bg-usaBlue text-white px-3 py-1 text-sm hover:opacity-90">
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