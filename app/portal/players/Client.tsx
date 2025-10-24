// app/portal/players/Client.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  primary_club_id: string | null;
};

type Club = { id: string; name: string; logo_url: string | null };

type RegistrationRow = {
  id: string;
  event_id: string | null;
  division_id: string | null;
  created_at: string | null;
  user_id: string;
  status: string | null;
  checked_in: boolean | null;
  notes: string | null;
};

type EventRow = { id: string; title: string; date: string | null; city: string | null };
type DivisionRow = { id: string; name: string };

type MyRegistration = {
  id: string;
  event_title: string;
  division_name: string | null;
  date: string | null;
  city: string | null;
  created_at: string | null;
  status: string | null;
  checked_in: boolean | null;
};

export default function PlayersClient() {
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [club, setClub] = useState<Club | null>(null);

  const [regs, setRegs] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Who am I?
        const { data: { user }, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;
        setEmail(user?.email ?? null);

        // Profile header
        const { data: p, error: perr } = await supabase
          .from('profiles')
          .select('first_name,last_name,avatar_url,primary_club_id')
          .maybeSingle<Profile>();
        if (perr) throw perr;
        setProfile(p);

        // Club (normalized)
        if (p?.primary_club_id) {
          const { data: c } = await supabase
            .from('clubs')
            .select('id,name,logo_url')
            .eq('id', p.primary_club_id)
            .maybeSingle<Club>();
          if (c) setClub(c);
        }

        // My registrations (RLS limits to me by user_id)
        const { data: r, error: rerr } = await supabase
          .from('registrations')
          .select('id,event_id,division_id,created_at,user_id,status,checked_in,notes')
          .order('created_at', { ascending: false });
        if (rerr) throw rerr;

        const mine = (r ?? []) as RegistrationRow[];

        // Hydrate with event & division names
        const eventIds = Array.from(new Set(mine.map(x => x.event_id).filter(Boolean))) as string[];
        const divisionIds = Array.from(new Set(mine.map(x => x.division_id).filter(Boolean))) as string[];

        const eventsById = new Map<string, EventRow>();
        const divisionsById = new Map<string, DivisionRow>();

        if (eventIds.length) {
          const { data: ev } = await supabase
            .from('events')
            .select('id,title,date,city')
            .in('id', eventIds);
          (ev ?? []).forEach(e => eventsById.set(e.id, e));
        }

        if (divisionIds.length) {
          const { data: dv } = await supabase
            .from('event_divisions')
            .select('id,name')
            .in('id', divisionIds);
          (dv ?? []).forEach(d => divisionsById.set(d.id, d));
        }

        const pretty: MyRegistration[] = mine.map(row => {
          const ev = row.event_id ? eventsById.get(row.event_id) : undefined;
          const dv = row.division_id ? divisionsById.get(row.division_id) : undefined;
          return {
            id: row.id,
            event_title: ev?.title ?? 'Untitled Event',
            division_name: dv?.name ?? null,
            date: ev?.date ?? null,
            city: ev?.city ?? null,
            created_at: row.created_at ?? null,
            status: row.status ?? null,
            checked_in: row.checked_in ?? null,
          };
        });

        setRegs(pretty);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || 'Failed to load your player data');
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-10">
        <p>Loading your player page…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen grid place-items-center p-10">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-600">Couldn’t load</h2>
          <p className="text-sm text-gray-700 mt-2">{err}</p>
          <p className="text-sm mt-4">
            <Link href="/portal/dashboard" className="text-usaBlue hover:underline">Back to dashboard</Link>
          </p>
        </div>
      </main>
    );
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Player';

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <img
            src={profile?.avatar_url || '/images/nco-mark.webp'}
            alt=""
            className="h-14 w-14 rounded-full object-cover border"
          />
          <div>
            <h1 className="text-2xl font-semibold">{fullName}</h1>
            <p className="text-sm text-gray-600">{email}</p>
            {club && (
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                {club.logo_url ? (
                  <img src={club.logo_url} alt="" className="h-4 w-4 object-contain rounded border" />
                ) : null}
                Club: <strong>{club.name}</strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/onboarding/profile"
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Edit profile
          </Link>
          <Link
            href="/portal/events"
            className="rounded bg-usaBlue text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Find events
          </Link>
        </div>
      </div>

      {/* Registrations */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">My registrations</h2>

        {regs.length === 0 ? (
          <div className="mt-3 rounded-xl border bg-white p-6 text-gray-600">
            You have no registrations yet. Browse{' '}
            <Link href="/portal/events" className="text-usaBlue hover:underline">events</Link>{' '}
            to get started.
          </div>
        ) : (
          <ul className="mt-3 grid gap-3">
            {regs.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.event_title}</p>
                    <p className="text-sm text-gray-600">
                      {r.division_name ? `Division: ${r.division_name}` : '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Status: <span className="font-medium">{r.status ?? '—'}</span>
                      {typeof r.checked_in === 'boolean' ? (
                        <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] ${
                          r.checked_in ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {r.checked_in ? 'Checked in' : 'Not checked in'}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{r.date ? new Date(r.date).toLocaleDateString() : 'TBD'}</p>
                    {r.city ? <p>{r.city}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Helpful nav */}
      <div className="mt-8 text-sm">
        <Link href="/portal/dashboard" className="text-usaBlue hover:underline">← Back to Dashboard</Link>
      </div>
    </main>
  );
}