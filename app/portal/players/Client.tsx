// app/portal/players/Client.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatProfileValueLabel, getProfileDisplayName } from '@/app/lib/profileCapabilities';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  primary_club_id: string | null;
  city: string | null;
  region: string | null;
  skill_level: string | null;
  favorite_bag_style: string | null;
  dominant_hand: string | null;
  home_venue: string | null;
  profile_visibility: string | null;
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

function formatProfileValue(value: string | null | undefined) {
  if (!value?.trim()) return 'Not set yet';
  return value.trim();
}

export default function Client() {
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
        if (!user?.id) {
          throw new Error('You must be signed in to view your player page.');
        }

        // Profile header and player identity fields
        const { data: p, error: perr } = await supabase
          .from('profiles')
          .select(`
            first_name,
            last_name,
            display_name,
            bio,
            avatar_url,
            primary_club_id,
            city,
            region,
            skill_level,
            favorite_bag_style,
            dominant_hand,
            home_venue,
            profile_visibility
          `)
          .eq('id', user.id)
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

        // My registrations
        const { data: r, error: rerr } = await supabase
          .from('registrations')
          .select('id,event_id,division_id,created_at,user_id,status,checked_in,notes')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        let mine: RegistrationRow[] = [];
        if (rerr) {
          // Don’t crash the page on permission errors; show empty state instead
          console.warn('Registrations query issue:', rerr);
        } else {
          mine = (r ?? []) as RegistrationRow[];
        }

        // Hydrate with event & division names
        const eventIds = Array.from(
          new Set(mine.map(x => x.event_id).filter(Boolean))
        ) as string[];
        const divisionIds = Array.from(
          new Set(mine.map(x => x.division_id).filter(Boolean))
        ) as string[];

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
        setErr(e?.message || 'Failed to load your player page');
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
            <Link href="/portal/dashboard" className="text-usaBlue hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const fullName = getProfileDisplayName({ ...profile, email });
  const location = [profile?.city, profile?.region].filter(Boolean).join(', ');

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- Player avatars can be remote storage URLs or fallback assets chosen at runtime. */}
          <img
            src={profile?.avatar_url || '/images/nco-mark.webp'}
            alt=""
            className="h-14 w-14 rounded-full object-cover border"
          />
          <div>
            <h1 className="text-2xl font-semibold">{fullName}</h1>
            <p className="text-sm text-gray-600">{email}</p>
            {location ? <p className="text-sm text-gray-600">{location}</p> : null}
            {club && (
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                {club.logo_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Club logos are dynamic remote assets and may come from environment-specific storage hosts. */}
                  <img src={club.logo_url} alt="" className="h-4 w-4 object-contain rounded border" />
                  </>
                ) : null}
                Club: <strong>{club.name}</strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/profile"
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

      {/* Player identity */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Player Identity</h2>
              <p className="mt-1 text-sm text-gray-600">
                Build out your NCO player presence so people know who they are throwing against.
              </p>
            </div>
            <Link
              href="/portal/profile"
              className="shrink-0 rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Update
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Skill level</p>
              <p className="mt-1 font-medium text-gray-900">{formatProfileValueLabel(profile?.skill_level)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Favorite bag style</p>
              <p className="mt-1 font-medium text-gray-900">{formatProfileValue(profile?.favorite_bag_style)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Dominant hand</p>
              <p className="mt-1 font-medium text-gray-900">{formatProfileValueLabel(profile?.dominant_hand)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Home venue</p>
              <p className="mt-1 font-medium text-gray-900">{formatProfileValue(profile?.home_venue)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Bio</p>
            <p className="mt-1 text-sm text-gray-700">
              {profile?.bio?.trim() || 'Add a short player bio, preferred throwing style, or just enough personality to make bracket day more interesting.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Badges</h2>
            <p className="mt-1 text-sm text-gray-600">
              Earn badges for registrations, events, clubs, and future NCO achievements.
            </p>
            <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-gray-500">
              Badge system coming soon. First up: First Event, Founding Member, Club Player, and Event Organizer.
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Community Activity</h2>
            <p className="mt-1 text-sm text-gray-600">
              Recent follows, badge unlocks, registrations, and club activity will live here.
            </p>
            <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-gray-500">
              Activity feed coming soon. No cornhole drama has been detected yet. Suspicious, frankly.
            </div>
          </div>
        </div>
      </section>

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
                        <span
                          className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] ${
                            r.checked_in ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
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
        <Link href="/portal/dashboard" className="text-usaBlue hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
