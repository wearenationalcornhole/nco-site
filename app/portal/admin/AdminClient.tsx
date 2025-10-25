'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

type EventRow = { id: string; title: string | null; date: string | null; city?: string | null };
type ViewerRow = { event_id: string; user_id: string; granted_at: string; email?: string | null };
type OrganizerRow = { event_id: string; user_id: string; email?: string | null };

export default function AdminClient() {
  const supabase = createClientComponentClient();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>('');

  // viewers
  const [viewerEmail, setViewerEmail] = useState('');
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [vBusy, setVBusy] = useState(false);

  // organizers
  const [orgEmail, setOrgEmail] = useState('');
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [oBusy, setOBusy] = useState(false);

  // load events
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('id,title,date,city')
        .order('date', { ascending: false });
      setEvents(data ?? []);
      if ((data ?? []).length && !eventId) setEventId((data ?? [])[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load viewers + organizers for selected event
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [{ data: v }, { data: a }] = await Promise.all([
        supabase.from('demo_bag_viewers').select('event_id,user_id,granted_at').eq('event_id', eventId),
        supabase.from('event_admins').select('event_id,user_id').eq('event_id', eventId),
      ]);

      const ids = Array.from(new Set([...(v ?? []).map(x => x.user_id), ...(a ?? []).map(x => x.user_id)])).filter(Boolean);

      // hydrate emails from profiles (if you store them there)
      let emailById = new Map<string,string>();
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id,email')
          .in('id', ids as string[]);
        (profiles ?? []).forEach((p: any) => emailById.set(p.id, p.email ?? null));
      }

      setViewers((v ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
      setOrganizers((a ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
    })();
  }, [supabase, eventId]);

  async function grantViewer() {
    if (!eventId || !viewerEmail) return;
    setVBusy(true);
    try {
      const { data: user } = await supabase.rpc('get_user_id_by_email', { p_email: viewerEmail.toLowerCase() }).single();
      const userId = user?.id as string | undefined;
      if (!userId) throw new Error('User has not signed up yet. Ask them to log in once via magic link.');

      const { error } = await supabase.from('demo_bag_viewers').insert({ event_id: eventId, user_id: userId });
      if (error) throw error;

      setViewerEmail('');
      const { data: v } = await supabase.from('demo_bag_viewers').select('event_id,user_id,granted_at').eq('event_id', eventId);
      setViewers(v ?? []);
    } catch (e: any) {
      alert(e.message || 'Failed to grant viewer access');
    } finally {
      setVBusy(false);
    }
  }

  async function revokeViewer(user_id: string) {
    const { error } = await supabase.from('demo_bag_viewers').delete().eq('event_id', eventId).eq('user_id', user_id);
    if (!error) setViewers(v => v.filter(x => x.user_id !== user_id));
  }

  async function addOrganizer() {
    if (!eventId || !orgEmail) return;
    setOBusy(true);
    try {
      const { data: user } = await supabase.rpc('get_user_id_by_email', { p_email: orgEmail.toLowerCase() }).single();
      const userId = user?.id as string | undefined;
      if (!userId) throw new Error('User has not signed up yet.');

      const { error } = await supabase.from('event_admins').insert({ event_id: eventId, user_id: userId });
      if (error) throw error;

      setOrgEmail('');
      const { data: a } = await supabase.from('event_admins').select('event_id,user_id').eq('event_id', eventId);
      setOrganizers(a ?? []);
    } catch (e: any) {
      alert(e.message || 'Failed to add organizer');
    } finally {
      setOBusy(false);
    }
  }

  async function removeOrganizer(user_id: string) {
    const { error } = await supabase.from('event_admins').delete().eq('event_id', eventId).eq('user_id', user_id);
    if (!error) setOrganizers(a => a.filter(x => x.user_id !== user_id));
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Event picker */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Select Event</h2>
        <select
          className="mt-3 w-full rounded border px-3 py-2"
          value={eventId}
          onChange={(e)=>setEventId(e.target.value)}
        >
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.title ?? 'Untitled'} {ev.date ? `— ${new Date(ev.date).toLocaleDateString()}` : ''}
            </option>
          ))}
        </select>
        <div className="mt-3 text-sm">
          <Link href={`/portal/demo-bags/${eventId}`} className="text-[#0A3161] underline">
            Open gallery for this event →
          </Link>
        </div>
      </div>

      {/* Grant demo viewer */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Grant Demo Viewer</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="viewer@example.com"
            value={viewerEmail}
            onChange={(e)=>setViewerEmail(e.target.value)}
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
            <li key={v.user_id} className="flex items-center justify-between py-2">
              <span className="text-sm">{v.email ?? v.user_id}</span>
              <button onClick={()=>revokeViewer(v.user_id)} className="text-sm text-red-600 hover:underline">
                Revoke
              </button>
            </li>
          ))}
          {viewers.length === 0 && <li className="py-2 text-sm text-gray-600">None yet</li>}
        </ul>
      </div>

      {/* Event organizers */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Event Organizers</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="organizer@example.com"
            value={orgEmail}
            onChange={(e)=>setOrgEmail(e.target.value)}
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
              <button onClick={()=>removeOrganizer(o.user_id)} className="text-sm text-red-600 hover:underline">
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