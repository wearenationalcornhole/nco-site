'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Item = {
  path: string;
  signedUrl: string;
  status: 'pending' | 'approved' | 'changes_requested';
  note: string | null;
};

export default function ApprovalClient({
  eventId,
  canModerate,
  initialItems,
}: {
  eventId: string;
  canModerate: boolean;
  initialItems: Item[];
}) {
  const supabase = createClientComponentClient();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [busy, setBusy] = useState<string | null>(null);

  // --- Legalese ack (per-event) ---
  const ackKey = `nco.demo.approvalAck.${eventId}`;
  const [acknowledged, setAcknowledged] = useState<boolean>(true);
  useEffect(() => {
    if (!canModerate) return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(ackKey) : null;
    setAcknowledged(saved === 'yes');
  }, [ackKey, canModerate]);

  const pending = useMemo(() => items.filter(i => i.status === 'pending'), [items]);
  const pendingCount = pending.length;

  // Per-item confirm
  const [confirmFor, setConfirmFor] = useState<string | null>(null);

  // Batch confirm
  const [confirmAll, setConfirmAll] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  function statusChip(s: Item['status']) {
    const map = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      changes_requested: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Changes requested' },
    } as const;
    const m = map[s];
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${m.bg} ${m.text}`}>{m.label}</span>;
  }

  async function upsertStatus(path: string, status: Item['status'], note: string | null) {
    setBusy(path);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const decided_by = user?.id ?? null;

      const { error } = await supabase
        .from('demo_bag_approvals')
        .upsert({
          event_id: eventId,
          file_path: path,
          status,
          note: note ?? null,
          decided_by,
          decided_at: new Date().toISOString(),
        });
      if (error) throw error;

      // fire-and-forget notify (single)
      if (status === 'approved') {
        void fetch('/portal/api/notify-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, filePath: path, note: note ?? null }),
        });
      }

      setItems(prev => prev.map(it => it.path === path ? { ...it, status, note } : it));
    } catch (e: any) {
      alert(e.message || 'Failed to save approval');
    } finally {
      setBusy(null);
    }
  }

  // ---- Legalese banner ----
  const Legalese = () => {
    if (!canModerate) return null;
    return (
      <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm text-yellow-900">
              <strong>Approval starts production.</strong> By approving demo images for this event, you authorize
              immediate production of the corresponding bags and agree to incur the associated costs.
            </p>
            {pendingCount > 0 && (
              <p className="mt-1 text-xs text-yellow-900">
                {pendingCount} design{pendingCount === 1 ? '' : 's'} pending approval.
              </p>
            )}
            {!acknowledged && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="ack"
                  type="checkbox"
                  className="h-4 w-4"
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAcknowledged(val);
                    try { localStorage.setItem(ackKey, val ? 'yes' : 'no'); } catch {}
                  }}
                />
                <label htmlFor="ack" className="text-sm text-yellow-900">
                  I understand approving a demo immediately starts bag production and charges may apply.
                </label>
              </div>
            )}
          </div>

          {canModerate && (
            <button
              disabled={!acknowledged || pendingCount === 0 || batchBusy}
              onClick={() => setConfirmAll(true)}
              className="self-start sm:self-auto rounded bg-green-700 text-white px-4 py-2 text-sm disabled:opacity-50"
              title={!acknowledged ? 'Acknowledge the production notice first' : 'Approve all pending designs'}
            >
              {batchBusy ? 'Approving…' : `Approve all pending (${pendingCount})`}
            </button>
          )}
        </div>
      </div>
    );
  };

  // ---- Request changes note (per item) ----
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // ---- Batch approve handler ----
  async function approveAllPending() {
    if (pendingCount === 0) { setConfirmAll(false); return; }
    setBatchBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const decided_by = user?.id ?? null;
      const decided_at = new Date().toISOString();

      // Build rows for bulk upsert
      const rows = pending.map(p => ({
        event_id: eventId,
        file_path: p.path,
        status: 'approved' as const,
        note: null,
        decided_by,
        decided_at,
      }));

      // Bulk upsert in one call
      const { error } = await supabase.from('demo_bag_approvals').upsert(rows);
      if (error) throw error;

      // Update local list
      setItems(prev =>
        prev.map(it => (it.status === 'pending' ? { ...it, status: 'approved', note: null } : it))
      );

      // One summary email to Greg with all approved file paths
      try {
        await fetch('/portal/api/notify-approval-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            files: pending.map(p => ({ filePath: p.path })),
          }),
        });
      } catch {
        // non-fatal
      }
    } catch (e: any) {
      alert(e.message || 'Bulk approval failed');
    } finally {
      setBatchBusy(false);
      setConfirmAll(false);
    }
  }

  return (
    <>
      <Legalese />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(it => (
          <figure key={it.path} className="rounded-lg border bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.signedUrl} alt="" className="w-full h-auto rounded" />
            <figcaption className="mt-2 text-xs text-gray-700 break-all flex items-center justify-between gap-2">
              <span className="truncate">{it.path.split('/').slice(1).join('/')}</span>
              {statusChip(it.status)}
            </figcaption>

            {it.note && (
              <div className="mt-1 text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded p-2">
                <span className="font-medium">Notes:</span> {it.note}
              </div>
            )}

            {canModerate && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  disabled={busy === it.path || !acknowledged}
                  onClick={() => setConfirmFor(it.path)}
                  className="rounded bg-green-600 text-white px-3 py-1 text-xs disabled:opacity-50"
                >
                  {busy === it.path ? 'Saving…' : 'Approve'}
                </button>
                <button
                  disabled={busy === it.path}
                  onClick={() => { setNoteFor(it.path); setNoteText(''); }}
                  className="rounded bg-yellow-600 text-white px-3 py-1 text-xs disabled:opacity-50"
                >
                  Request changes
                </button>
              </div>
            )}

            {/* Inline note editor */}
            {canModerate && noteFor === it.path && (
              <div className="mt-2 border rounded p-2">
                <label className="block text-xs text-gray-700 mb-1">Describe the changes needed</label>
                <textarea
                  className="w-full rounded border px-2 py-1 text-sm"
                  rows={3}
                  value={noteText}
                  onChange={(e)=>setNoteText(e.target.value)}
                  placeholder="Color tweak on fast side, enlarge sponsor logo 10%, etc."
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    disabled={busy === it.path || !noteText.trim()}
                    onClick={() => { upsertStatus(it.path, 'changes_requested', noteText.trim()); setNoteFor(null); }}
                    className="rounded bg-yellow-700 text-white px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Save note
                  </button>
                  <button
                    disabled={busy === it.path}
                    onClick={() => setNoteFor(null)}
                    className="rounded border px-3 py-1 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </figure>
        ))}
      </div>

      {/* Per-item confirm */}
      {canModerate && confirmFor && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Confirm approval</h3>
            <p className="mt-2 text-sm text-gray-700">
              Approving this demo immediately starts bag production and incurs costs. Continue?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmFor(null)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
              <button
                onClick={async () => {
                  const path = confirmFor!;
                  setConfirmFor(null);
                  await upsertStatus(path, 'approved', null);
                }}
                className="rounded bg-green-600 text-white px-3 py-1.5 text-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch confirm */}
      {canModerate && confirmAll && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Approve all pending</h3>
            <p className="mt-2 text-sm text-gray-700">
              This will approve {pendingCount} pending design{pendingCount === 1 ? '' : 's'} and immediately start production.
              One summary email will be sent to the production inbox.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmAll(false)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
              <button
                onClick={approveAllPending}
                disabled={batchBusy}
                className="rounded bg-green-700 text-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {batchBusy ? 'Approving…' : 'Approve all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}