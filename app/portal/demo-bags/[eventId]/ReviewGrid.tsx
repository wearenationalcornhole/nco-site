'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type FileRow = { path: string; signedUrl: string };
type AssetRow = { path: string; status: 'pending'|'approved'|'changes_requested'; notes?: string|null; approved_by?: string|null; approved_at?: string|null };

export default function ReviewGrid({
  eventId,
  files,
  canApprove, // admin or organizer
}: {
  eventId: string;
  files: FileRow[];
  canApprove: boolean;
}) {
  const supabase = createClientComponentClient();

  const [assets, setAssets] = useState<Record<string, AssetRow>>({});
  const [ack, setAck] = useState<Record<string, boolean>>({}); // per-file acknowledgment checkbox
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Load current statuses
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('demo_bag_assets')
        .select('path,status,notes,approved_by,approved_at')
        .eq('event_id', eventId);

      const map: Record<string, AssetRow> = {};
      (data ?? []).forEach((r) => { map[r.path] = r as AssetRow; });

      // any file missing in table is pending by default
      files.forEach(f => {
        if (!map[f.path]) map[f.path] = { path: f.path, status: 'pending' };
      });

      setAssets(map);
    })();
  }, [eventId, files, supabase]);

  const list = useMemo(() => {
    // keep file order, merge status
    return files.map(f => ({ ...f, review: assets[f.path] || { path: f.path, status: 'pending' as const } }));
  }, [files, assets]);

  async function upsertStatus(path: string, status: AssetRow['status'], notes?: string) {
    setBusy((b) => ({ ...b, [path]: true }));
    try {
      const payload: any = {
        event_id: eventId,
        path,
        status,
        notes: notes ?? null,
      };
      if (status === 'approved') {
        payload.approved_at = new Date().toISOString();
      } else {
        payload.approved_at = null;
      }

      const { error } = await supabase
        .from('demo_bag_assets')
        .upsert(payload, { onConflict: 'event_id,path' });

      if (error) throw error;

      setAssets((prev) => ({
        ...prev,
        [path]: {
          path,
          status,
          notes: notes ?? null,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        },
      }));
    } catch (e:any) {
      alert(e.message || 'Update failed');
    } finally {
      setBusy((b) => ({ ...b, [path]: false }));
    }
  }

  async function approve(path: string) {
    if (!ack[path]) {
      alert('Please acknowledge that approval starts production and incurs costs.');
      return;
    }
    await upsertStatus(path, 'approved');
  }

  async function requestChanges(path: string) {
    const msg = (noteDraft[path] ?? '').trim();
    if (!msg) {
      alert('Please provide notes explaining what to change.');
      return;
    }
    await upsertStatus(path, 'changes_requested', msg);
    // keep note visible but you can clear if desired:
    // setNoteDraft((n) => ({ ...n, [path]: '' }));
  }

  const statusBadge = (s: AssetRow['status']) => {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    if (s === 'approved') return <span className={`${base} bg-green-100 text-green-700`}>Approved</span>;
    if (s === 'changes_requested') return <span className={`${base} bg-yellow-100 text-yellow-800`}>Changes requested</span>;
    return <span className={`${base} bg-gray-200 text-gray-700`}>Pending</span>;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {list.map(({ path, signedUrl, review }) => (
        <figure key={path} className="rounded-lg border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signedUrl} alt="" className="w-full h-auto rounded" />
          <figcaption className="mt-2 text-xs text-gray-600 break-all">{path.split('/').slice(1).join('/')}</figcaption>

          <div className="mt-2">{statusBadge(review.status)}</div>

          {review.status === 'changes_requested' && review.notes && (
            <div className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-900">
              <div className="font-semibold">Requested changes:</div>
              <div className="whitespace-pre-wrap">{review.notes}</div>
            </div>
          )}

          {canApprove && (
            <div className="mt-3 space-y-2">
              {/* Approval acknowledgment (explicit) */}
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={!!ack[path]}
                  onChange={(e) => setAck((a) => ({ ...a, [path]: e.target.checked }))}
                />
                <span>
                  <strong>Approving this demo immediately starts bag production and incurs costs.</strong>
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  className="rounded bg-[#0A3161] text-white px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={busy[path] || !ack[path]}
                  onClick={() => approve(path)}
                >
                  {busy[path] ? 'Saving…' : 'Approve'}
                </button>
                <button
                  className="rounded bg-[#B31942] text-white px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={busy[path]}
                  onClick={() => requestChanges(path)}
                >
                  {busy[path] ? 'Saving…' : 'Request changes'}
                </button>
              </div>

              {/* Notes only used when requesting changes */}
              <textarea
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                rows={3}
                placeholder="Provide detailed notes for adjustments…"
                value={noteDraft[path] ?? ''}
                onChange={(e) => setNoteDraft((n) => ({ ...n, [path]: e.target.value }))}
              />
            </div>
          )}
        </figure>
      ))}
    </div>
  );
}