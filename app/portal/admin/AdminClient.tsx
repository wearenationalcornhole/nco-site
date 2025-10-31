// app/portal/admin/AdminClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'player' | 'organizer' | 'admin';

type Profile = {
  id: string;
  role: Role | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;        // optional but useful if you store it in profiles
  avatar_url?: string | null;
};

type EventRow = { id: string; title: string | null; date: string | null; city?: string | null };
type ViewerRow = { event_id: string; user_id: string; granted_at: string; email?: string | null };
type OrganizerRow = { event_id: string; user_id: string; email?: string | null };

export default function AdminClient() {
  const supabase = createClientComponentClient();

  // ---- Users & Roles ----
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [qUsers, setQUsers] = useState('');

  // ---- Events picker ----
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [search, setSearch] = useState('');

  // ---- Viewers ----
  const [viewerEmail, setViewerEmail] = useState('');
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [vBusy, setVBusy] = useState(false);

  // ---- Organizers ----
  const [orgEmail, setOrgEmail] = useState('');
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [oBusy, setOBusy] = useState(false);

  // ---- UI helpers ----
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Load base data once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [{ data: p, error: perr }, { data: ev, error: everr }] = await Promise.all([
          supabase.from('profiles').select('id,role,first_name,last_name,email,avatar_url').order('first_name', { ascending: true }),
          supabase.from('events').select('id,title,date,city').order('date', { ascending: false }),
        ]);
        if (perr) throw perr;
        if (everr) throw everr;

        if (!alive) return;
        setProfiles(p ?? []);
        setEvents(ev ?? []);
        if (!eventId && (ev ?? []).length) setEventId((ev ?? [])[0].id);
      } catch (e: any) {
        if (!alive) return;
        setErr(e.message || 'Failed to load admin data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter events by search term
  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return events;
    return events.filter(
      (e) =>
        (e.title ?? '').toLowerCase().includes(term) ||
        (e.city ?? '').toLowerCase().includes(term) ||
        (e.date ?? '').includes(term)
    );
  }, [search, events]);

  // Filter users by search
  const filteredProfiles = useMemo(() => {
    const needle = qUsers.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter(p => {
      const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      return name.includes(needle) || email.includes(needle) || p.id.includes(needle);
    });
  }, [profiles, qUsers]);

  // Load viewers + organizers when event changes
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [{ data: v }, { data: a }] = await Promise.all([
        supabase.from('demo_bag_viewers').select('event_id,user_id,granted_at').eq('event_id', eventId),
        supabase.from('event_admins').select('event_id,user_id').eq('event_id', eventId),
      ]);

      const ids = Array.from(new Set([...(v ?? []).map(x => x.user_id), ...(a ?? []).map(x => x.user_id)])).filter(Boolean) as string[];

      let emailById = new Map<string, string | null>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id,email')
          .in('id', ids);
        (profs ?? []).forEach((p: any) => emailById.set(p.id, p.email ?? null));
      }

      setViewers((v ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
      setOrganizers((a ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
    })();
  }, [supabase, eventId]);

  // Refresh helper for current event lists
  async function refreshLists() {
    if (!eventId) return;
    const [{ data: v }, { data: a }] = await Promise.all([
      supabase.from('demo_bag_viewers').select('event_id,user_id,granted_at').eq('event_id', eventId),
      supabase.from('event_admins').select('event_id,user_id').eq('event_id', eventId),
    ]);

    const ids = Array.from(new Set([...(v ?? []).map(x => x.user_id), ...(a ?? []).map(x => x.user_id)])).filter(Boolean) as string[];

    let emailById = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id,email')
        .in('id', ids);
      (profs ?? []).forEach((p: any) => emailById.set(p.id, p.email ?? null));
    }

    setViewers((v ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
    setOrganizers((a ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
  }

  // ---- Users & Roles actions ----
  async function setRole(userId: string, role: Role) {
    const prev = profiles.slice();
    setProfiles(ps => ps.map(p => p.id === userId ? { ...p, role } : p));
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) {
      setProfiles(prev);
      alert(`Failed to set role: ${error.message}`);
    }
  }

  // ---- Viewers actions ----
  async function grantViewer() {
    if (!eventId || !viewerEmail) return;
    setVBusy(true);
    try {
      const { data: userRow, error: rpcErr } = await supabase
        .rpc('get_user_id_by_email', { p_email: viewerEmail.toLowerCase() })
        .maybeSingle<{ id: string }>();
      if (rpcErr) throw rpcErr;

      const userId = userRow?.id;
      if (!userId) throw new Error('User has not signed up yet. Ask them to log in once via magic link.');

      const { error } = await supabase
        .from('demo_bag_viewers')
        .insert({ event_id: eventId, user_id: userId });
      if (error) throw error;

      setViewerEmail('');
      await refreshLists();
    } catch (e: any) {
      alert(e.message || 'Failed to grant viewer access');
    } finally {
      setVBusy(false);
    }
  }

  async function revokeViewer(user_id: string) {
    const { error } = await supabase
      .from('demo_bag_viewers')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user_id);
    if (!error) setViewers(v => v.filter(x => x.user_id !== user_id));
  }

  // ---- Organizers actions ----
  async function addOrganizer() {
    if (!eventId || !orgEmail) return;
    setOBusy(true);
    try {
      const { data: userRow, error: rpcErr } = await supabase
        .rpc('get_user_id_by_email', { p_email: orgEmail.toLowerCase() })
        .maybeSingle<{ id: string }>();
      if (rpcErr) throw rpcErr;

      const userId = userRow?.id;
      if (!userId) throw new Error('User has not signed up yet.');

      const { error } = await supabase
        .from('event_admins')
        .insert({ event_id: eventId, user_id: userId });
      if (error) throw error;

      setOrgEmail('');
      await refreshLists();
    } catch (e: any) {
      alert(e.message || 'Failed to add organizer');
    } finally {
      setOBusy(false);
    }
  }

  async function removeOrganizer(user_id: string) {
    const { error } = await supabase
      .from('event_admins')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user_id);
    if (!error) setOrganizers(a => a.filter(x => x.user_id !== user_id));
  }

  // Share link for this event
  function copyShareLink() {
    if (!eventId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/portal/demo-bags/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedFor(eventId);
      setTimeout(() => setCopiedFor(null), 1500);
    }).catch(() => { alert(url); });
  }

  // ---- Render ----
  if (loading) return <main className="min-h-screen grid place-items-center">Loading…</main>;
  if (err) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md bg-white rounded shadow p-4">
          <p className="text-red-600 font-semibold">Admin error</p>
          <p className="text-sm mt-2">{err}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* USERS & ROLES */}
      <div className="rounded-xl border bg-white p-6 md:col-span-2">
        <h2 className="text-lg font-semibold text-[#0A3161]">Users & Roles</h2>
        <div className="mt-3 flex gap-2 items-center">
          <input
            className="rounded border px-3 py-2 text-sm w-full md:w-80"
            placeholder="Search users by name, email, or id…"
            value={qUsers}
            onChange={(e)=>setQUsers(e.target.value)}
          />
          <span className="text-xs text-gray-500">{filteredProfiles.length} / {profiles.length}</span>
        </div>

        <div className="mt-3 overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 text-gray-600">
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th className="w-56">Set Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProfiles.map(u => (
                <tr key={u.id} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="font-medium">
                    {(u.first_name || u.last_name)
                      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                      : u.id}
                  </td>
                  <td className="text-gray-700">{u.email ?? '—'}</td>
                  <td className="capitalize">{u.role ?? 'player'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={()=>setRole(u.id,'player')} className="rounded border px-2 py-1 text-xs">Player</button>
                      <button onClick={()=>setRole(u.id,'organizer')} className="rounded border px-2 py-1 text-xs">Organizer</button>
                      <button onClick={()=>setRole(u.id,'admin')} className="rounded border px-2 py-1 text-xs">Admin</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr><td className="px-3 py-3 text-gray-600" colSpan={4}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVENT PICKER */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Select Event</h2>
        <input
          className="mt-3 w-full rounded border px-3 py-2 text-sm"
          type="text"
          placeholder="Search by name, city, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="mt-3 w-full rounded border px-3 py-2"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          {filteredEvents.length > 0 ? (
            filteredEvents.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title ?? 'Untitled'} {ev.date ? `— ${new Date(ev.date).toLocaleDateString()}` : ''}
              </option>
            ))
          ) : (
            <option value="">No matches found</option>
          )}
        </select>
        <div className="mt-3 flex items-center gap-3 text-sm">
          {eventId ? (
            <>
              <Link href={`/portal/demo-bags/${eventId}`} className="text-[#0A3161] underline">
                Open gallery for this event →
              </Link>
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded border px-2 py-1"
                title="Copy share link to clipboard"
              >
                {copiedFor === eventId ? 'Copied!' : 'Copy share link'}
              </button>
            </>
          ) : (
            <span className="text-gray-500">Choose an event to open its gallery</span>
          )}
        </div>
      </div>

      {/* GRANT DEMO VIEWER */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Grant Demo Viewer</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="viewer@example.com"
            value={viewerEmail}
            onChange={(e) => setViewerEmail(e.target.value)}
          />
          <button
            disabled={!viewerEmail || vBusy}
            onClick={grantViewer}
            className="rounded bg-[#B31942] text-white px-4 py-2 disabled:opacity-50"
          >
            {vBusy ? 'Granting…' : 'Grant'}
          </button>
        </div>

        <h3 className="mt-5 font-medium">Current Viewers</h3>
        <ul className="mt-2 divide-y">
          {viewers.map(v => (
            <li key={v.user_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2">
              <span className="text-sm">{v.email ?? v.user_id}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyShareLink}
                  className="text-sm rounded border px-2 py-1"
                  title="Copy share link for this event"
                >
                  {copiedFor === eventId ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={() => revokeViewer(v.user_id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
          {viewers.length === 0 && <li className="py-2 text-sm text-gray-600">None yet</li>}
        </ul>
      </div>

      {/* EVENT ORGANIZERS */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Event Organizers</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="organizer@example.com"
            value={orgEmail}
            onChange={(e) => setOrgEmail(e.target.value)}
          />
          <button
            disabled={!orgEmail || oBusy}
            onClick={addOrganizer}
            className="rounded bg-[#0A3161] text-white px-4 py-2 disabled:opacity-50"
          >
            {oBusy ? 'Adding…' : 'Add'}
          </button>
        </div>

        <h3 className="mt-5 font-medium">Current Organizers</h3>
        <ul className="mt-2 divide-y">
          {organizers.map(o => (
            <li key={o.user_id} className="flex items-center justify-between py-2">
              <span className="text-sm">{o.email ?? o.user_id}</span>
              <button onClick={() => removeOrganizer(o.user_id)} className="text-sm text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
          {organizers.length === 0 && <li className="py-2 text-sm text-gray-600">None yet</li>}
        </ul>
      </div>
    </div>
  );
}