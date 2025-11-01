export const revalidate = 0;
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import GalleryClient from '../ui/GalleryClient';
import { GALLERIES } from '../config';

type Params = { slug: string };

export default async function DemoBagsEventPage(
  { params }: { params: Promise<Params> } // matches your project typing
) {
  const { slug } = await params;
  const supabase = createServerComponentClient({ cookies });

  // 1) Require auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/demo-bags/${slug}`)}`);
  }

  // 2) Resolve event by slug
  const { data: ev, error: evErr } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (evErr || !ev?.id) {
    // No event row? If there is a static config, we can still show it (admin-only by default).
    const cfg = GALLERIES[slug];
    if (!cfg) notFound();

    // Basic guard: only admins can view static fallback without event row
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (me?.role !== 'admin') {
      redirect('/portal/dashboard');
    }

    return (
      <MainShell title={cfg.title} slug={slug} logo={cfg.logo}>
        <GalleryClient images={cfg.images} />
      </MainShell>
    );
  }

  const eventId = ev.id as string;

  // 3) Authorization: admin OR organizer-of-event OR explicit viewer
  let authorized = false;

  const [{ data: me }, { data: org }, { data: viewer }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('event_admins').select('event_id').eq('event_id', eventId).eq('user_id', user.id).maybeSingle(),
    supabase.from('demo_bag_viewers').select('event_id').eq('event_id', eventId).eq('user_id', user.id).maybeSingle(),
  ]);

  authorized = (me?.role === 'admin') || !!org || !!viewer;
  if (!authorized) {
    redirect('/portal/dashboard');
  }

  // 4) Try Supabase Storage first
  const { data: listing, error: listErr } = await supabase.storage
    .from('demo-bags')
    .list(eventId, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  let images: { src: string; caption?: string }[] = [];

  if (!listErr && (listing ?? []).length > 0) {
    const files = (listing ?? []).filter(f => !f.name.endsWith('/'));
    const { data: signed } = await supabase.storage
      .from('demo-bags')
      .createSignedUrls(files.map(f => `${eventId}/${f.name}`), 3600);

    images = (signed ?? [])
      .filter(s => s?.signedUrl)
      .map(s => ({ src: s.signedUrl as string, caption: s.path?.split('/').pop() ?? '' }));
  } else {
    // 5) Fallback to static gallery (exactly like demo-gallery)
    const cfg = GALLERIES[slug];
    if (cfg && cfg.images.length > 0) {
      images = cfg.images;
    }
  }

  if (images.length === 0) {
    return (
      <MainShell title={ev.title ?? slug} slug={slug}>
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No demo images yet for this event.
        </div>
      </MainShell>
    );
  }

  return (
    <MainShell title={ev.title ?? slug} slug={slug}>
      <GalleryClient images={images} />
    </MainShell>
  );
}

// --- layout wrapper to keep styles/branding tidy ---
function MainShell({ title, slug, logo, children }:{
  title: string;
  slug: string;
  logo?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-6">
      <meta name="robots" content="noindex,nofollow" />
      <header className="text-center mb-8">
        {logo && <img src={logo} alt="Event Logo" className="mx-auto mb-4 max-h-16" />}
        <h1 className="text-2xl font-semibold text-[#0A3161]">{title}</h1>
        <div className="mt-3">
          <Link href="/portal/demo-bags" className="inline-block text-sm font-medium text-white px-3 py-1.5 rounded" style={{ backgroundColor: '#0A3161' }}>
            ← Back to All Demos
          </Link>
        </div>
      </header>
      {children}
    </main>
  );
}