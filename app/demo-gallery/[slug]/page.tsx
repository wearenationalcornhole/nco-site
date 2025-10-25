// app/demo-gallery/[slug]/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { DEMO_GALLERIES } from '../config';
import GalleryClient from '../ui/GalleryClient';

// Your project types params as a *Promise*, so we await it.
type Params = { slug: string };

export default async function DemoBagsEventPage(
  { params }: { params: Promise<Params> } // matches your PageProps constraint
) {
  const { slug } = await params; // unwrap promised params
  const gallery = DEMO_GALLERIES[slug];

  if (!gallery) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <meta name="robots" content="noindex,nofollow" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-700 mb-3">Not found</h1>
          <p className="text-gray-500 mb-6">
            This demo link may be expired or incorrect.
          </p>
          <Link
            href="/demo-gallery"
            className="text-white px-4 py-2 rounded"
            style={{ backgroundColor: '#0A3161' }}
          >
            ← Back to Demo Gallery
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-6">
      <meta name="robots" content="noindex,nofollow" />
      <header className="text-center mb-8">
        {gallery.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gallery.logo} alt="Event Logo" className="mx-auto mb-4 max-h-16" />
        )}
        <h1 className="text-2xl font-semibold text-[#0A3161]">{gallery.title}</h1>
        <div className="mt-3">
          <Link
            href="/demo-gallery"
            className="inline-block text-sm font-medium text-white px-3 py-1.5 rounded"
            style={{ backgroundColor: '#0A3161' }}
          >
            ← Back to All Demos
          </Link>
        </div>
      </header>

      <GalleryClient images={gallery.images} />
    </main>
  );
}