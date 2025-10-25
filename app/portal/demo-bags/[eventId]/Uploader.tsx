'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Item = {
  file: File;
  name: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
};

export default function Uploader({ eventId }: { eventId: string }) {
  const supabase = createClientComponentClient();
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const accept = 'image/*'; // keep it simple; expand if you want PDFs, etc.
  const maxSize = 15 * 1024 * 1024; // 15 MB per file

  const onPick = (files: FileList | null) => {
    if (!files?.length) return;
    const next: Item[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith('image/')) {
        next.push({ file: f, name: f.name, status: 'error', error: 'Not an image' });
        return;
      }
      if (f.size > maxSize) {
        next.push({ file: f, name: f.name, status: 'error', error: 'File too large (>15MB)' });
        return;
      }
      next.push({ file: f, name: f.name, status: 'queued' });
    });
    setItems((prev) => [...prev, ...next]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onPick(e.dataTransfer.files);
  };

  const onBrowse = () => inputRef.current?.click();

  const removeItem = (name: string) => {
    setItems((prev) => prev.filter((i) => i.name !== name));
  };

  const uploadAll = useCallback(async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const toUpload = items.filter((i) => i.status === 'queued' || i.status === 'error');
      for (const it of toUpload) {
        // mark uploading
        setItems((prev) => prev.map((p) => p.name === it.name ? { ...p, status: 'uploading', error: undefined } : p ));

        // generate a sluggy name with timestamp to avoid collisions
        const ext = it.file.name.split('.').pop() || 'jpg';
        const base = it.file.name.replace(/\.[^/.]+$/, '');
        const safeBase = base.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
        const finalName = `${Date.now()}-${safeBase}.${ext}`;

        const path = `${eventId}/${finalName}`;
        const { error } = await supabase.storage
          .from('demo-bags')
          .upload(path, it.file, { upsert: false, cacheControl: '3600' });

        if (error) {
          setItems((prev) => prev.map((p) => p.name === it.name ? { ...p, status: 'error', error: error.message } : p ));
        } else {
          setItems((prev) => prev.map((p) => p.name === it.name ? { ...p, status: 'done' } : p ));
        }
      }
    } finally {
      setBusy(false);
    }
  }, [eventId, items, supabase]);

  const hasQueued = items.some((i) => i.status === 'queued' || i.status === 'error');

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="font-semibold text-gray-900">Upload images</h3>
      <p className="text-sm text-gray-600">PNG, JPG, or WEBP. Max 15MB each. Files land in <code>demo-bags/{eventId}/</code>.</p>

      <div
        className="mt-3 grid gap-3 sm:grid-cols-[1fr,auto]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="rounded-lg border-2 border-dashed p-4 text-center">
          <p className="text-sm text-gray-700">Drag & drop files here</p>
          <p className="text-xs text-gray-500 mt-1">or</p>
          <button
            type="button"
            onClick={onBrowse}
            className="mt-2 rounded bg-[#0A3161] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
          />
        </div>

        <div className="flex items-start sm:items-center gap-2">
          <button
            type="button"
            disabled={!hasQueued || busy}
            onClick={uploadAll}
            className="rounded bg-[#B31942] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border px-3 py-2 text-sm"
          >
            Refresh gallery
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y">
          {items.map((it) => (
            <li key={it.name} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="text-xs text-gray-600">
                  {it.status === 'queued' && 'Queued'}
                  {it.status === 'uploading' && 'Uploading…'}
                  {it.status === 'done' && 'Uploaded'}
                  {it.status === 'error' && <span className="text-red-600">Error: {it.error}</span>}
                </div>
              </div>
              <button
                className="text-sm text-gray-600 hover:text-red-600"
                onClick={() => removeItem(it.name)}
                disabled={it.status === 'uploading'}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}