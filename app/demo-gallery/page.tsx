// app/demo-gallery/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { DEMO_GALLERIES } from './config';

export default function DemoGalleryIndex() {
  // Turn the config object into an array for easy mapping
  const items = Object.entries(DEMO_GALLERIES).map(([slug, g]) => ({
    slug,
    name: g.title,
    img: g.logo ?? (g.images?.[0]?.src ?? '/images/nco-mark.png'),
  }));

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
      <meta name="robots" content="noindex,nofollow" />

      <header className="text-center mb-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/nco-mark.webp"
          alt="National Cornhole Logo"
          className="mx-auto mb-4 h-16"
        />
        <h1 className="text-3xl font-semibold text-[#0A3161]">
          Cornhole Tournament Bag Demos
        </h1>
      </header>

      <div
        className="mx-auto grid gap-8"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', maxWidth: 1000 }}
      >
        {items.map((t) => (
          <Link
            key={t.slug}
            href={`/demo-gallery/${t.slug}`}
            className="group block bg-white rounded-2xl shadow-md hover:-translate-y-1 hover:shadow-xl transition transform text-center p-6"
          >
            <div className="mx-auto mb-4 h-32 w-full relative">
              <Image
                src={t.img}
                alt={t.name}
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="text-gray-800 font-medium group-hover:text-[#0A3161]">
              {t.name}
            </p>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-center text-gray-600">No demo galleries configured.</div>
        )}
      </div>
    </main>
  );
}