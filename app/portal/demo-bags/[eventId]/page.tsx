// app/portal/demo-bags/[eventId]/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import ApprovalClient from './ui/ApprovalClient';

type Params = { eventId: string };

function isUuidV4ish(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function DemoBagsEventPage({ params }: { params: Promise<Params> }) {
  const { eventId: raw } = await params;
  const supabase = createServerComponentClient({ cookies });

  // Resolve slug -> UUID if needed
  let eventId = raw;
  if (!isUuidV4ish(raw)) {
    const { data: ev } = await supabase
      .from('events')
      .select('id,slug,title')
      .ilike('slug', raw)
      .maybeSingle();
    if (!ev?.id) notFound();
    eventId = ev.id as string;
  }

  // Auth required
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/demo-bags/${raw}`)}`);
  }

  // Role + permissions (admin / organizer / explicit viewer)
  const [{ data: me }, { data: org }, { data: viewer }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('event_admins').select('event_id').eq('event_id', eventId).eq('user_id', user.id).maybeSingle(),
    supabase.from('demo_bag_viewers').select('event_id').eq('event_id', eventId).eq('user_id', user.id).maybeSingle(),
  ]);

  const isAdmin = me?.role === 'admin';
  const isOrganizer = !!org;
  const isViewer = !!viewer;
  const canSee = isAdmin || isOrganizer || isViewer;
  const canModerate = isAdmin || isOrganizer; // only these see Approve / Request Changes

  if (!canSee) redirect('/portal/dashboard');

  // List files in Storage: demo-bags/<eventId>/*
  const { data: listing, error: listErr } = await supabase.storage
    .from('demo-bags')
    .list(eventId, { limit: 500, sortBy: { column: 'name', order: 'asc' } });

  if (listErr) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold text-[#0A3161]">Demo Bags</h1>
        <p className="text-sm text-gray-600">Event <code>{raw}</code></p>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <p className="text-red-600 font-medium">Could not list demo images.</p>
          <p className="text-sm text-gray-600 mt-1">{listErr.message}</p>
        </div>
      </main>
    );
  }

  const files = (listing ?? []).filter(f => !f.name.endsWith('/'));
  let signed: { path: string; signedUrl: string }[] = [];
  if (files.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from('demo-bags')
      .createSignedUrls(files.map(f => `${eventId}/${f.name}`), 3600);
    signed = (signedUrls ?? [])
      .filter(s => s.path && s.signedUrl)
      .map(s => ({ path: s.path as string, signedUrl: s.signedUrl as string }));
  }

  // Fetch existing approval statuses for these files
  let approvals: Record<string, { status: 'pending'|'approved'|'changes_requested'; note: string | null }> = {};
  if (signed.length > 0) {
    const { data: rows } = await supabase
      .from('demo_bag_approvals')
      .select('file_path,status,note')
      .eq('event_id', eventId)
      .in('file_path', signed.map(s => s.path));

    (rows ?? []).forEach(r => {
      approvals[r.file_path] = { status: r.status as any, note: r.note ?? null };
    });
  }

  // Build items for client
  const items = signed.map(s => ({
    path: s.path,
    signedUrl: s.signedUrl,
    status: approvals[s.path]?.status ?? 'pending',
    note: approvals[s.path]?.note ?? null,
  }));

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A3161]">Demo Bags</h1>
        <p className="text-sm text-gray-600">
          Event: <code>{raw}</code>
          {canModerate && <span className="ml-3 rounded bg-[#0A3161]/10 px-2 py-0.5 text-xs text-[#0A3161]">Moderator</span>}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No demo images yet for this event.
        </div>
      ) : (
        <ApprovalClient eventId={eventId} canModerate={canModerate} initialItems={items} />
      )}
    </main>
  );
}