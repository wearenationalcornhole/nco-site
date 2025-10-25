// app/portal/demo-bags/[eventId]/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

type Params = { eventId: string };

export default async function DemoBagsEventPage(
  { params }: { params: Promise<Params> } // 👈 your project requires Promise here
) {
  const { eventId } = await params;

  const supabase = createServerComponentClient({ cookies });

  // 1) Require auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/demo-bags/${eventId}`)}`);
  }

  // 2) Gate: admin OR organizer for this event
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  let authorized = me?.role === 'admin';
  if (!authorized) {
    const { data: link } = await supabase
      .from('event_admins')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();
    authorized = !!link;
  }
  if (!authorized) {
    redirect('/portal/dashboard'); // or render a 403 page
  }

  // 3) List files in private bucket "demo-bags" under <eventId>/
  const { data: listing, error: listErr } = await supabase.storage
    .from('demo-bags')
    .list(eventId, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  if (listErr) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Demo Bags</h1>
        <p className="text-sm text-gray-600">Event: <code>{eventId}</code></p>
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
    signed = signedUrls ?? [];
  }

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Demo Bags</h1>
        <p className="text-sm text-gray-600">Event: <code>{eventId}</code></p>
      </div>

      {signed.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No demo images yet for this event.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {signed.map(s => (
            <figure key={s.path} className="rounded-lg border bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.signedUrl} alt="" className="w-full h-auto rounded" />
              <figcaption className="mt-2 text-xs text-gray-600 break-all">
                {s.path.split('/').slice(1).join('/')}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}