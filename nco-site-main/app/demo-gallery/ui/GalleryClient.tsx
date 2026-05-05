// app/demo-gallery/ui/GalleryClient.tsx
'use client';

import { useState } from 'react';

export default function GalleryClient({ images }: { images: { src: string; caption?: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((img, i) => (
        <figure key={img.src} className="rounded-lg border bg-white p-2 cursor-pointer" onClick={() => setOpen(i)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} alt={img.caption ?? ''} className="w-full h-auto rounded" />
          {img.caption && <figcaption className="mt-2 text-xs text-gray-600">{img.caption}</figcaption>}
        </figure>
      ))}

      {/* super simple lightbox */}
      {open !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open].src} alt={images[open].caption ?? ''} className="max-h-[80vh] w-auto rounded" />
        </div>
      )}
    </div>
  );
}