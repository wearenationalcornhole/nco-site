// app/portal/demo-bags/[slug]/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import * as CFG from '../config';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';
import GalleryClient from '../ui/GalleryClient';
import * as CFG from '../config'; // supports GALLERIES or DEMO_GALLERIES

type Params = { slug: string };

type DemoGallery = {
  title: string;
  logo?: string;
  images: { src: string; caption?: string; filename?: string }[];
};

// accept GALLERIES, DEMO_GALLERIES, or default
const STATIC_GALLERIES: Record<string, DemoGallery> =
  // @ts-ignore
  (CFG as any).GALLERIES ??
  // @ts-ignore
  (CFG as any).DEMO_GALLERIES ??
  // @ts-ignore
  (CFG as any).default ??
  {};

function isUuidV4ish(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function DemoBagsHybridPage(
  { params }: { params: Promise<Params> } // matches your project typing
) {
  const { slug: raw } = await params;

  // ⬅️ IMPORTANT: await the server client
  const supabase = await getSupabaseServer();

  // 1) Resolve eventId (UUID or slug)
  let eventId = raw;
  if (!isUuidV4ish(raw)) {
    const { data: ev } = await supabase
      .from('events')
      .select('id')
      .ilike('slug', raw)
      .maybeSingle();

    eventId = ev?.id ?? ''; // empty string means "no event row"
  }

  // 2) Try Supabase Storage listing first (if we have an eventId)
  let storageImages: { src: string; caption?: string; filename?: string }[] | null = null;

  if (eventId) {
    const { data: listing, error: listErr } = await supabase.storage
      .from('demo-bags')
      .list(eventId, { limit: 500, sortBy: { column: 'name', order: 'asc' } });

    if (!listErr && Array.isArray(listing) && listing.length > 0) {
      // Gate storage-backed galleries with auth/authorization
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/demo-bags/${raw}`)}`);
      }

      // admin OR event organizer OR explicit viewer
      let authorized = false;
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .maybeSingle();

      if (me?.role === 'admin') {
        authorized = true;
      } else {
        const [{ data: org }, { data: viewer }] = await Promise.all([
          supabase
            .from('event_admins')
            .select('event_id')
            .eq('event_id', eventId)
            .eq('user_id', user!.id)
            .maybeSingle(),
          supabase
            .from('demo_bag_viewers')
            .select('event_id')
            .eq('event_id', eventId)
            .eq('user_id', user!.id)
            .maybeSingle(),
        ]);
        authorized = !!org || !!viewer;
      }

      if (!authorized) {
        redirect('/portal/dashboard');
      }

      const files = listing.filter((f) => !f.name.endsWith('/'));
      let signed: { path: string; signedUrl: string }[] = [];

      if (files.length > 0) {
        const { data: signedUrls } = await supabase.storage
          .from('demo-bags')
          .createSignedUrls(files.map((f) => `${eventId}/${f.name}`), 3600);

        signed =
          (signedUrls ?? [])
            .filter((s) => s?.path && s?.signedUrl)
            .map((s) => ({ path: s.path as string, signedUrl: s.signedUrl as string })) ?? [];
      }

      storageImages = signed.map((s) => {
        const filename = s.path.split('/').pop() ?? 'image.png';
        return { src: s.signedUrl, caption: filename, filename };
      });
    }
  }

  // 3) Fallback to static config by slug (public)
  const staticGallery = STATIC_GALLERIES[raw];

  // If neither storage nor static has anything, 404
  if ((!storageImages || storageImages.length === 0) && !staticGallery) {
    notFound();
  }

  const title =
    staticGallery?.title ??
    `Demo Bags${isUuidV4ish(raw) ? '' : ` — ${raw}`}`;
  const logo = staticGallery?.logo;

  const images =
    storageImages && storageImages.length > 0
      ? storageImages
      : (staticGallery?.images ?? []);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-6">
      <meta name="robots" content="noindex,nofollow" />
      <header className="text-center mb-8">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Event Logo" className="mx-auto mb-4 max-h-16" />
        ) : null}
        <h1 className="text-2xl font-semibold text-[#0A3161]">{title}</h1>
      </header>

      <GalleryClient images={images} slug={raw} />
    </main>
  );
}