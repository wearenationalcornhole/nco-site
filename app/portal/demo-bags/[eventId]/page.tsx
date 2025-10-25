// app/portal/demo-bags/[eventId]/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Uploader from './Uploader';
import ReviewGrid from './ReviewGrid';

type Params = { eventId: string }; // may be a UUID or a slug

function isUuidV4ish(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function DemoBagsEventPage(
  { params }: { params: Promise<Params> }
) {
  const { eventId: raw } = await params;
  const supabase = createServerComponentClient({ cookies });

  // 0) Resolve slug → event id (if needed)
  let eventId = raw;
  if (!isUuidV4ish(raw)) {
    const { data: ev } = await supabase
      .from('events')
      .select('id, slug')
      .ilike('slug', raw) // case-insensitive match
      .maybeSingle();

    if (!ev?.id) notFound();
    eventId = ev.id as string;
  }

  // 1) Require auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/demo-bags/${raw}`)}`);
  }

  // 2) Who am I?
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = me?.role === 'admin';

  // 3) Authorization: admin OR organizer-of-event OR explicit viewer
  const [{ data: orgRow }, { data: viewerRow }] = await Promise.all([
    supabase
      .from('event_admins')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('demo_bag_viewers')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const isOrganizer = !!orgRow;
  const isViewer = !!viewerRow;

  const authorized = isAdmin || isOrganizer || isViewer;
  if (!authorized) {
    redirect('/portal/dashboard');
  }

  // 4) List files in Storage: demo-bags/<eventId>/*
  const { data: listing, error: listErr } = await supabase.storage
    .from('demo-bags')
    .list(eventId, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  if (listErr) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold text-[#0A3161]">Demo Bags</h1>
        <p className="text-sm text-gray-600">Event: <code>{raw}</code></p>
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
      .map(s => ({
        path: s.path as string,
        signedUrl: s.signedUrl as string,
      }));
  }

  // Only admins can upload; admins OR organizers can approve/request changes
  const canUpload = isAdmin;
  const canApprove = isAdmin || isOrganizer;

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A3161]">Demo Bags</h1>
        <p className="text-sm text-gray-600">Event: <code>{raw}</code></p>
      </div>

      {canUpload && (
        <div className="mb-6">
          <Uploader eventId={eventId} />
        </div>
      )}

      {signed.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No demo images yet for this event.
        </div>
      ) : (
        <ReviewGrid
          eventId={eventId}
          files={signed /* { path, signedUrl }[] */}
          canApprove={canApprove}
        />
      )}
    </main>
  );
}