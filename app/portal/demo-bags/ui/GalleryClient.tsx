// app/portal/demo-bags/ui/GalleryClient.tsx
'use client';

import { useState } from 'react';

export type GalleryImage = {
  src: string;
  caption?: string;
  filename?: string;
};

export default function GalleryClient({
  images,
  slug,
}: {
  images: GalleryImage[];
  slug?: string;
}) {
  const [zipping, setZipping] = useState(false);

  const onDownloadAll = async () => {
    if (!images?.length) return;
    setZipping(true);
    try {
      const files = images.map((img) => ({
        url: toAbsolute(img.src),
        name: img.filename || safeNameFromUrl(img.src),
      }));
      const res = await fetch(`/portal/api/zip?name=${encodeURIComponent(slug || 'demo-bags')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error('Zip failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'demo-bags'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not create zip. Try individual downloads.');
      console.error(e);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={onDownloadAll}
          disabled={!images.length || zipping}
          className="rounded bg-[#0A3161] text-white px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {zipping ? 'Preparing…' : 'Download all as .zip'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img) => {
          const filename = img.filename || safeNameFromUrl(img.src);
          const href = toAbsolute(img.src);
          return (
            <figure key={href} className="rounded-lg border bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={href} alt={img.caption || filename} className="w-full h-auto rounded" />
              <figcaption className="mt-2 text-xs text-gray-700 break-all">{img.caption || filename}</figcaption>
              <div className="mt-2">
                <a
                  href={href}
                  download={filename}
                  className="inline-block text-xs rounded border px-2 py-1 hover:bg-gray-50"
                >
                  Download
                </a>
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function safeNameFromUrl(u: string) {
  try {
    const p = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const last = p.pathname.split('/').filter(Boolean).pop() || 'image.png';
    return decodeURIComponent(last.split('?')[0]);
  } catch {
    const parts = u.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'image.png';
  }
}

function toAbsolute(u: string) {
  if (/^https?:\/\//i.test(u)) return u;
  if (typeof window !== 'undefined') {
    const base = window.location.origin.replace(/\/+$/, '');
    return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
  }
  return u;
}