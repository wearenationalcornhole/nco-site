// app/portal/admin/AdminClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'player' | 'organizer' | 'admin';

type Profile = {
  id: string;
  role: Role | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;        // optional but useful if you store it in profiles
  avatar_url?: string | null;
};

type EventRow = { id: string; title: string | null; date: string | null; city?: string | null };
type ViewerRow = { event_id: string; user_id: string; granted_at: string; email?: string | null };
type OrganizerRow = { event_id: string; user_id: string; email?: string | null };
type CheckoutRow = {
  id: string;
  type: 'store' | 'event' | 'other';
  status: string;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  createdAt: string | null;
};
type RegistrationActivityRow = {
  id: string;
  eventTitle: string;
  userName: string;
  email: string | null;
  createdAt: string | null;
};
type Overview = {
  stats: {
    players: number;
    organizers: number;
    admins: number;
    clubs: number;
    events: number;
    upcomingEvents: number;
    registrations: number;
    storeProducts: number;
    featuredProducts: number;
    storeOrderCount: number;
    refundedStoreOrderCount: number;
    storeRevenueCents: number;
    eventPaymentCount: number;
    paidEventPaymentCount: number;
    pendingEventPaymentCount: number;
    refundedEventPaymentCount: number;
    cancelledEventPaymentCount: number;
    eventRevenueCents: number;
    webhookDeliveries: number;
    failedWebhookDeliveries: number;
    retryableWebhookFailures: number;
  };
  config: {
    siteUrl: string;
    hasSupabaseUrl: boolean;
    hasSupabaseAnonKey: boolean;
    hasSupabaseServiceRole: boolean;
    hasDatabaseUrl: boolean;
    hasStripeSecretKey: boolean;
    hasStripeWebhookSecret: boolean;
  };
  capabilities: {
    storeOrderPersistence: boolean;
    eventPaymentPersistence: boolean;
    paymentAuditPersistence: boolean;
    webhookLogPersistence: boolean;
  };
  recentRegistrations: RegistrationActivityRow[];
  recentCheckouts: CheckoutRow[];
  recentStoreOrders: Array<{
    id: string;
    stripeSessionId: string;
    email: string | null;
    status: string;
    currency: string;
    subtotalAmount: number;
    totalAmount: number;
    itemCount: number;
    createdAt: string | null;
  }>;
  recentEventPayments: Array<{
    id: string;
    eventId: string;
    eventTitle: string;
    eventSlug: string | null;
    userId: string;
    userName: string;
    email: string | null;
    registrationId: string | null;
    stripeCheckoutSessionId: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string | null;
  }>;
  recentPaymentActions: Array<{
    id: string;
    kind: string;
    action: string;
    targetId: string;
    actorUserId: string | null;
    actorName: string;
    actorRole: string | null;
    eventId: string | null;
    eventTitle: string | null;
    storeOrderId: string | null;
    paymentId: string | null;
    registrationId: string | null;
    statusBefore: string | null;
    statusAfter: string | null;
    stripeRefundId: string | null;
    note: string | null;
    createdAt: string | null;
  }>;
  recentWebhookDeliveries: Array<{
    id: string;
    provider: string;
    source: string;
    route: string;
    attemptKind: string;
    eventType: string | null;
    status: string;
    stripeEventId: string | null;
    stripeCheckoutSessionId: string | null;
    stripePaymentIntentId: string | null;
    eventId: string | null;
    userId: string | null;
    registrationId: string | null;
    httpStatus: number | null;
    errorMessage: string | null;
    note: string | null;
    retryParentLogId: string | null;
    createdAt: string | null;
    processedAt: string | null;
    retryable: boolean;
  }>;
};

export default function AdminClient() {
  const supabase = createClientComponentClient();
  const [overview, setOverview] = useState<Overview | null>(null);

  // ---- Users & Roles ----
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [qUsers, setQUsers] = useState('');

  // ---- Events picker ----
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [search, setSearch] = useState('');

  // ---- Viewers ----
  const [viewerEmail, setViewerEmail] = useState('');
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [vBusy, setVBusy] = useState(false);

  // ---- Organizers ----
  const [orgEmail, setOrgEmail] = useState('');
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [oBusy, setOBusy] = useState(false);

  // ---- UI helpers ----
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [paymentActionKey, setPaymentActionKey] = useState<string | null>(null);
  const [webhookRetryKey, setWebhookRetryKey] = useState<string | null>(null);

  // Load base data once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [overviewRes, { data: p, error: perr }, { data: ev, error: everr }] = await Promise.all([
          fetch('/portal/api/admin/overview', { cache: 'no-store' }).then(async (response) => {
            if (!response.ok) {
              const payload = await response.json().catch(() => ({}));
              throw new Error(payload?.error ?? 'Failed to load admin overview');
            }
            return response.json() as Promise<Overview>;
          }),
          supabase.from('profiles').select('id,role,first_name,last_name,email,avatar_url').order('first_name', { ascending: true }),
          supabase.from('events').select('id,title,date,city').order('date', { ascending: false }),
        ]);
        if (perr) throw perr;
        if (everr) throw everr;

        if (!alive) return;
        setOverview(overviewRes);
        setProfiles(p ?? []);
        setEvents(ev ?? []);
        if (!eventId && (ev ?? []).length) setEventId((ev ?? [])[0].id);
      } catch (e: any) {
        if (!alive) return;
        setErr(e.message || 'Failed to load admin data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter events by search term
  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return events;
    return events.filter(
      (e) =>
        (e.title ?? '').toLowerCase().includes(term) ||
        (e.city ?? '').toLowerCase().includes(term) ||
        (e.date ?? '').includes(term)
    );
  }, [search, events]);

  // Filter users by search
  const filteredProfiles = useMemo(() => {
    const needle = qUsers.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter(p => {
      const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      return name.includes(needle) || email.includes(needle) || p.id.includes(needle);
    });
  }, [profiles, qUsers]);

  async function refreshOverview() {
    try {
      const response = await fetch('/portal/api/admin/overview', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as Overview;
      setOverview(payload);
    } catch {
      // Keep the current overview visible if the refresh fails.
    }
  }

  async function runPaymentAction(
    kind: 'store_order' | 'event_registration',
    id: string,
    action: 'refund' | 'cancel',
    removeRegistration?: boolean,
  ) {
    const actionKey = `${kind}:${id}:${action}`;
    const label =
      action === 'refund'
        ? 'This will issue a full Stripe refund and update the persisted payment status.'
        : 'This will mark the payment record as cancelled.'

    if (!window.confirm(label)) return

    try {
      setPaymentActionKey(actionKey)
      const response = await fetch('/portal/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, action, removeRegistration }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Payment action failed')
      }

      await refreshOverview()
    } catch (error: any) {
      alert(error?.message ?? 'Payment action failed')
    } finally {
      setPaymentActionKey(null)
    }
  }

  async function retryWebhookLog(id: string) {
    if (!window.confirm('Retry this failed webhook persistence attempt from the admin portal?')) return;

    try {
      setWebhookRetryKey(id);
      const response = await fetch('/portal/api/webhooks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Webhook retry failed');
      }

      await refreshOverview();
    } catch (error: any) {
      alert(error?.message ?? 'Webhook retry failed');
    } finally {
      setWebhookRetryKey(null);
    }
  }

  // Load viewers + organizers when event changes
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [{ data: v }, { data: a }] = await Promise.all([
        supabase.from('demo_bag_viewers').select('event_id,user_id,granted_at').eq('event_id', eventId),
        supabase.from('event_admins').select('event_id,user_id').eq('event_id', eventId),
      ]);

      const ids = Array.from(new Set([...(v ?? []).map(x => x.user_id), ...(a ?? []).map(x => x.user_id)])).filter(Boolean) as string[];

      let emailById = new Map<string, string | null>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id,email')
          .in('id', ids);
        (profs ?? []).forEach((p: any) => emailById.set(p.id, p.email ?? null));
      }

      setViewers((v ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
      setOrganizers((a ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
    })();
  }, [supabase, eventId]);

  // Refresh helper for current event lists
  async function refreshLists() {
    if (!eventId) return;
    const [{ data: v }, { data: a }] = await Promise.all([
      supabase.from('demo_bag_viewers').select('event_id,user_id,granted_at').eq('event_id', eventId),
      supabase.from('event_admins').select('event_id,user_id').eq('event_id', eventId),
    ]);

    const ids = Array.from(new Set([...(v ?? []).map(x => x.user_id), ...(a ?? []).map(x => x.user_id)])).filter(Boolean) as string[];

    let emailById = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id,email')
        .in('id', ids);
      (profs ?? []).forEach((p: any) => emailById.set(p.id, p.email ?? null));
    }

    setViewers((v ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
    setOrganizers((a ?? []).map(x => ({ ...x, email: emailById.get(x.user_id) ?? null })));
  }

  // ---- Users & Roles actions ----
  async function setRole(userId: string, role: Role) {
    const prev = profiles.slice();
    setProfiles(ps => ps.map(p => p.id === userId ? { ...p, role } : p));
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) {
      setProfiles(prev);
      alert(`Failed to set role: ${error.message}`);
      return;
    }
    await refreshOverview();
  }

  // ---- Viewers actions ----
  async function grantViewer() {
    if (!eventId || !viewerEmail) return;
    setVBusy(true);
    try {
      const { data: userRow, error: rpcErr } = await supabase
        .rpc('get_user_id_by_email', { p_email: viewerEmail.toLowerCase() })
        .maybeSingle<{ id: string }>();
      if (rpcErr) throw rpcErr;

      const userId = userRow?.id;
      if (!userId) throw new Error('User has not signed up yet. Ask them to log in once via magic link.');

      const { error } = await supabase
        .from('demo_bag_viewers')
        .insert({ event_id: eventId, user_id: userId });
      if (error) throw error;

      setViewerEmail('');
      await refreshLists();
    } catch (e: any) {
      alert(e.message || 'Failed to grant viewer access');
    } finally {
      setVBusy(false);
    }
  }

  async function revokeViewer(user_id: string) {
    const { error } = await supabase
      .from('demo_bag_viewers')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user_id);
    if (!error) setViewers(v => v.filter(x => x.user_id !== user_id));
  }

  // ---- Organizers actions ----
  async function addOrganizer() {
    if (!eventId || !orgEmail) return;
    setOBusy(true);
    try {
      const { data: userRow, error: rpcErr } = await supabase
        .rpc('get_user_id_by_email', { p_email: orgEmail.toLowerCase() })
        .maybeSingle<{ id: string }>();
      if (rpcErr) throw rpcErr;

      const userId = userRow?.id;
      if (!userId) throw new Error('User has not signed up yet.');

      const { error } = await supabase
        .from('event_admins')
        .insert({ event_id: eventId, user_id: userId });
      if (error) throw error;

      setOrgEmail('');
      await refreshLists();
    } catch (e: any) {
      alert(e.message || 'Failed to add organizer');
    } finally {
      setOBusy(false);
    }
  }

  async function removeOrganizer(user_id: string) {
    const { error } = await supabase
      .from('event_admins')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user_id);
    if (!error) setOrganizers(a => a.filter(x => x.user_id !== user_id));
  }

  // Share link for this event
  function copyShareLink() {
    if (!eventId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/portal/demo-bags/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedFor(eventId);
      setTimeout(() => setCopiedFor(null), 1500);
    }).catch(() => { alert(url); });
  }

  // ---- Render ----
  if (loading) return <main className="min-h-screen grid place-items-center">Loading…</main>;
  if (err) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md bg-white rounded shadow p-4">
          <p className="text-red-600 font-semibold">Admin error</p>
          <p className="text-sm mt-2">{err}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {overview && (
        <>
          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0A3161]">Platform Overview</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Live counts and readiness checks for the current public site, portal, store, and payment stack.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Site URL: <span className="font-medium text-gray-700">{overview.config.siteUrl}</span>
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewCard label="Players" value={String(overview.stats.players)} detail="Profiles mapped to the player role" />
              <OverviewCard label="Organizers" value={String(overview.stats.organizers)} detail="Organizer accounts in the portal" />
              <OverviewCard label="Events" value={`${overview.stats.events}`} detail={`${overview.stats.upcomingEvents} upcoming on the calendar`} />
              <OverviewCard label="Registrations" value={String(overview.stats.registrations)} detail="Total event registrations captured" />
              <OverviewCard label="Store Catalog" value={String(overview.stats.storeProducts)} detail={`${overview.stats.featuredProducts} featured products live`} />
              <OverviewCard label="Store Orders" value={String(overview.stats.storeOrderCount)} detail={`${formatMoney(overview.stats.storeRevenueCents, 'usd')} active revenue · ${overview.stats.refundedStoreOrderCount} refunded`} />
              <OverviewCard label="Event Payments" value={String(overview.stats.eventPaymentCount)} detail={`${overview.stats.paidEventPaymentCount} settled · ${overview.stats.pendingEventPaymentCount} pending · ${overview.stats.refundedEventPaymentCount} refunded`} />
              <OverviewCard label="Event Revenue" value={formatMoney(overview.stats.eventRevenueCents, 'usd')} detail="Settled paid-registration volume" />
              <OverviewCard label="Webhook Failures" value={String(overview.stats.failedWebhookDeliveries)} detail={`${overview.stats.retryableWebhookFailures} retryable out of ${overview.stats.webhookDeliveries} recent deliveries`} />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-[#0A3161]">Environment Readiness</h2>
            <div className="mt-4 space-y-3">
              <ReadinessRow label="Supabase URL" ready={overview.config.hasSupabaseUrl} />
              <ReadinessRow label="Supabase anon key" ready={overview.config.hasSupabaseAnonKey} />
              <ReadinessRow label="Supabase service role" ready={overview.config.hasSupabaseServiceRole} />
              <ReadinessRow label="Database URL" ready={overview.config.hasDatabaseUrl} />
              <ReadinessRow label="Stripe secret key" ready={overview.config.hasStripeSecretKey} />
              <ReadinessRow label="Stripe webhook secret" ready={overview.config.hasStripeWebhookSecret} />
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Store order persistence: <strong>{overview.capabilities.storeOrderPersistence ? 'Enabled' : 'Not yet enabled'}</strong>
              </p>
              <p className="mt-2">
                Event payment persistence: <strong>{overview.capabilities.eventPaymentPersistence ? 'Enabled' : 'Not yet enabled'}</strong>
              </p>
              <p className="mt-2">
                Payment audit persistence: <strong>{overview.capabilities.paymentAuditPersistence ? 'Enabled' : 'Not yet enabled'}</strong>
              </p>
              <p className="mt-2">
                Webhook log persistence: <strong>{overview.capabilities.webhookLogPersistence ? 'Enabled' : 'Not yet enabled'}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-[#0A3161]">Catalog Operations</h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage live store products, pricing, featured placement, inventory status, and imagery without changing code.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/portal/admin/store"
                className="rounded bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Open Store Manager
              </Link>
              <Link
                href="/shop"
                className="rounded border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
              >
                View Public Store
              </Link>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-[#0A3161]">Recent Stripe Checkout Activity</h2>
            {overview.recentCheckouts.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No recent checkout sessions are visible yet, or Stripe is not configured in this environment.
              </p>
            ) : (
              <ul className="mt-4 divide-y">
                {overview.recentCheckouts.map((checkout) => (
                  <li key={checkout.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {checkout.customerEmail ?? 'Unknown customer'} · {checkout.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {checkout.createdAt ? new Date(checkout.createdAt).toLocaleString() : 'Unknown time'} · {checkout.status} / {checkout.paymentStatus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatMoney(checkout.amountTotal, checkout.currency)}
                      </p>
                      <p className="text-xs text-gray-500">{checkout.id}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-[#0A3161]">Persisted Store Orders</h2>
            {!overview.capabilities.storeOrderPersistence ? (
              <p className="mt-4 text-sm text-gray-600">
                Store order persistence is not active yet in this environment. Apply the schema changes before relying on durable order history.
              </p>
            ) : overview.recentStoreOrders.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No persisted store orders have been recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-gray-600">
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overview.recentStoreOrders.map((order) => (
                      <tr key={order.id} className="[&>td]:px-3 [&>td]:py-2">
                        <td>
                          <div className="font-medium">{order.email ?? 'Unknown customer'}</div>
                          <div className="text-xs text-gray-500">{order.stripeSessionId}</div>
                        </td>
                        <td className="capitalize">{order.status}</td>
                        <td>{order.itemCount}</td>
                        <td>{formatMoney(order.totalAmount, order.currency)}</td>
                        <td className="text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</td>
                        <td>
                          {order.status.toLowerCase() === 'refunded' ? (
                            <span className="text-xs text-gray-500">Refunded</span>
                          ) : (
                            <button
                              onClick={() => runPaymentAction('store_order', order.id, 'refund')}
                              disabled={paymentActionKey === `store_order:${order.id}:refund`}
                              className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              {paymentActionKey === `store_order:${order.id}:refund` ? 'Refunding…' : 'Refund'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-[#0A3161]">Persisted Event Payments</h2>
            {!overview.capabilities.eventPaymentPersistence ? (
              <p className="mt-4 text-sm text-gray-600">
                Event payment persistence is not active yet in this environment. Apply the schema changes before relying on durable payment history.
              </p>
            ) : overview.recentEventPayments.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No persisted event payment records have been recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-gray-600">
                      <th>Event</th>
                      <th>Player</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overview.recentEventPayments.map((payment) => (
                      <tr key={payment.id} className="[&>td]:px-3 [&>td]:py-2">
                        <td>
                          <div className="font-medium">{payment.eventTitle}</div>
                          <div className="text-xs text-gray-500">{payment.stripeCheckoutSessionId}</div>
                        </td>
                        <td>
                          <div>{payment.userName}</div>
                          <div className="text-xs text-gray-500">{payment.email ?? payment.userId}</div>
                        </td>
                        <td className="capitalize">{payment.status}</td>
                        <td>{formatMoney(payment.amountCents, payment.currency)}</td>
                        <td className="text-gray-500">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '—'}</td>
                        <td>
                          {payment.status.toLowerCase() === 'paid' ? (
                            <button
                              onClick={() => runPaymentAction('event_registration', payment.id, 'refund', true)}
                              disabled={paymentActionKey === `event_registration:${payment.id}:refund`}
                              className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              {paymentActionKey === `event_registration:${payment.id}:refund` ? 'Refunding…' : 'Refund'}
                            </button>
                          ) : payment.status.toLowerCase() === 'pending' ? (
                            <button
                              onClick={() => runPaymentAction('event_registration', payment.id, 'cancel', false)}
                              disabled={paymentActionKey === `event_registration:${payment.id}:cancel`}
                              className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              {paymentActionKey === `event_registration:${payment.id}:cancel` ? 'Cancelling…' : 'Cancel'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 capitalize">{payment.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-[#0A3161]">Webhook Delivery Health</h2>
            {!overview.capabilities.webhookLogPersistence ? (
              <p className="mt-4 text-sm text-gray-600">
                Webhook delivery logging is not active yet in this environment. Apply the schema changes before relying on durable delivery diagnostics.
              </p>
            ) : overview.recentWebhookDeliveries.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No webhook delivery logs have been recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-gray-600">
                      <th>Source</th>
                      <th>Status</th>
                      <th>Identifiers</th>
                      <th>Notes</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overview.recentWebhookDeliveries.map((log) => (
                      <tr key={log.id} className="[&>td]:px-3 [&>td]:py-2 align-top">
                        <td>
                          <div className="font-medium">{log.source.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500">{log.route}</div>
                          <div className="text-xs text-gray-500">{log.attemptKind.replace(/_/g, ' ')}</div>
                        </td>
                        <td>
                          <div className="capitalize">{log.status.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500">{log.eventType ?? 'Unknown event'}</div>
                        </td>
                        <td className="text-xs text-gray-600">
                          <div>{log.stripeCheckoutSessionId ?? log.stripeEventId ?? 'No Stripe id'}</div>
                          {log.eventId ? <div>Event: {log.eventId}</div> : null}
                          {log.userId ? <div>User: {log.userId}</div> : null}
                        </td>
                        <td className="text-xs text-gray-600">
                          <div>{log.errorMessage ?? log.note ?? '—'}</div>
                          {log.httpStatus ? <div className="mt-1 text-gray-500">HTTP {log.httpStatus}</div> : null}
                        </td>
                        <td className="text-gray-500">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                        </td>
                        <td>
                          {log.retryable ? (
                            <button
                              onClick={() => retryWebhookLog(log.id)}
                              disabled={webhookRetryKey === log.id}
                              className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              {webhookRetryKey === log.id ? 'Retrying…' : 'Retry'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">No retry</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-[#0A3161]">Recent Payment Actions</h2>
            {!overview.capabilities.paymentAuditPersistence ? (
              <p className="mt-4 text-sm text-gray-600">
                Payment audit persistence is not active yet in this environment. Apply the schema changes before relying on immutable support history.
              </p>
            ) : overview.recentPaymentActions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No payment actions have been logged yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-gray-600">
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Target</th>
                      <th>Status Change</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overview.recentPaymentActions.map((entry) => (
                      <tr key={entry.id} className="[&>td]:px-3 [&>td]:py-2">
                        <td>
                          <div className="font-medium capitalize">{entry.action}</div>
                          <div className="text-xs text-gray-500">{entry.kind.replace(/_/g, ' ')}</div>
                        </td>
                        <td>
                          <div>{entry.actorName}</div>
                          <div className="text-xs text-gray-500">{entry.actorRole ?? 'system'}</div>
                        </td>
                        <td>
                          <div>{entry.eventTitle ?? entry.storeOrderId ?? entry.targetId}</div>
                          <div className="text-xs text-gray-500">{entry.note ?? entry.targetId}</div>
                        </td>
                        <td className="text-gray-700">
                          {(entry.statusBefore ?? '—')} → {entry.statusAfter ?? '—'}
                        </td>
                        <td className="text-gray-500">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-[#0A3161]">Recent Registration Activity</h2>
            {overview.recentRegistrations.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No registration activity is available yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-gray-600">
                      <th>Event</th>
                      <th>Player</th>
                      <th>Email</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overview.recentRegistrations.map((registration) => (
                      <tr key={registration.id} className="[&>td]:px-3 [&>td]:py-2">
                        <td className="font-medium">{registration.eventTitle}</td>
                        <td>{registration.userName}</td>
                        <td className="text-gray-700">{registration.email ?? '—'}</td>
                        <td className="text-gray-500">
                          {registration.createdAt ? new Date(registration.createdAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* USERS & ROLES */}
      <div className="rounded-xl border bg-white p-6 md:col-span-2">
        <h2 className="text-lg font-semibold text-[#0A3161]">Users & Roles</h2>
        <div className="mt-3 flex gap-2 items-center">
          <input
            className="rounded border px-3 py-2 text-sm w-full md:w-80"
            placeholder="Search users by name, email, or id…"
            value={qUsers}
            onChange={(e)=>setQUsers(e.target.value)}
          />
          <span className="text-xs text-gray-500">{filteredProfiles.length} / {profiles.length}</span>
        </div>

        <div className="mt-3 overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 text-gray-600">
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th className="w-56">Set Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProfiles.map(u => (
                <tr key={u.id} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="font-medium">
                    {(u.first_name || u.last_name)
                      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                      : u.id}
                  </td>
                  <td className="text-gray-700">{u.email ?? '—'}</td>
                  <td className="capitalize">{u.role ?? 'player'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={()=>setRole(u.id,'player')} className="rounded border px-2 py-1 text-xs">Player</button>
                      <button onClick={()=>setRole(u.id,'organizer')} className="rounded border px-2 py-1 text-xs">Organizer</button>
                      <button onClick={()=>setRole(u.id,'admin')} className="rounded border px-2 py-1 text-xs">Admin</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr><td className="px-3 py-3 text-gray-600" colSpan={4}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVENT PICKER */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Select Event</h2>
        <input
          className="mt-3 w-full rounded border px-3 py-2 text-sm"
          type="text"
          placeholder="Search by name, city, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="mt-3 w-full rounded border px-3 py-2"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          {filteredEvents.length > 0 ? (
            filteredEvents.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title ?? 'Untitled'} {ev.date ? `— ${new Date(ev.date).toLocaleDateString()}` : ''}
              </option>
            ))
          ) : (
            <option value="">No matches found</option>
          )}
        </select>
        <div className="mt-3 flex items-center gap-3 text-sm">
          {eventId ? (
            <>
              <Link href={`/portal/demo-bags/${eventId}`} className="text-[#0A3161] underline">
                Open gallery for this event →
              </Link>
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded border px-2 py-1"
                title="Copy share link to clipboard"
              >
                {copiedFor === eventId ? 'Copied!' : 'Copy share link'}
              </button>
            </>
          ) : (
            <span className="text-gray-500">Choose an event to open its gallery</span>
          )}
        </div>
      </div>

      {/* GRANT DEMO VIEWER */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Grant Demo Viewer</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="viewer@example.com"
            value={viewerEmail}
            onChange={(e) => setViewerEmail(e.target.value)}
          />
          <button
            disabled={!viewerEmail || vBusy}
            onClick={grantViewer}
            className="rounded bg-[#B31942] text-white px-4 py-2 disabled:opacity-50"
          >
            {vBusy ? 'Granting…' : 'Grant'}
          </button>
        </div>

        <h3 className="mt-5 font-medium">Current Viewers</h3>
        <ul className="mt-2 divide-y">
          {viewers.map(v => (
            <li key={v.user_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2">
              <span className="text-sm">{v.email ?? v.user_id}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyShareLink}
                  className="text-sm rounded border px-2 py-1"
                  title="Copy share link for this event"
                >
                  {copiedFor === eventId ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={() => revokeViewer(v.user_id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
          {viewers.length === 0 && <li className="py-2 text-sm text-gray-600">None yet</li>}
        </ul>
      </div>

      {/* EVENT ORGANIZERS */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0A3161]">Event Organizers</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="organizer@example.com"
            value={orgEmail}
            onChange={(e) => setOrgEmail(e.target.value)}
          />
          <button
            disabled={!orgEmail || oBusy}
            onClick={addOrganizer}
            className="rounded bg-[#0A3161] text-white px-4 py-2 disabled:opacity-50"
          >
            {oBusy ? 'Adding…' : 'Add'}
          </button>
        </div>

        <h3 className="mt-5 font-medium">Current Organizers</h3>
        <ul className="mt-2 divide-y">
          {organizers.map(o => (
            <li key={o.user_id} className="flex items-center justify-between py-2">
              <span className="text-sm">{o.email ?? o.user_id}</span>
              <button onClick={() => removeOrganizer(o.user_id)} className="text-sm text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
          {organizers.length === 0 && <li className="py-2 text-sm text-gray-600">None yet</li>}
        </ul>
      </div>
    </div>
  );
}

function OverviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          ready ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
        }`}
      >
        {ready ? 'Ready' : 'Missing'}
      </span>
    </div>
  );
}

function formatMoney(amountTotal: number | null, currency: string | null) {
  if (amountTotal == null || !currency) return '—';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountTotal / 100);
  } catch {
    return `${amountTotal / 100} ${currency.toUpperCase()}`;
  }
}
