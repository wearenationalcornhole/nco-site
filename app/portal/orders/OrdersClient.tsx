'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type StoreOrderItem = {
  productSlug: string
  title: string
  unitAmount: number
  quantity: number
}

type StoreOrder = {
  id: string
  stripeSessionId: string
  email: string | null
  status: string
  currency: string
  subtotalAmount: number
  totalAmount: number
  itemCount: number
  createdAt: string | null
  items: StoreOrderItem[]
}

type EventPayment = {
  id: string
  eventId: string
  eventTitle: string
  eventSlug: string | null
  userId: string
  userName: string
  email: string | null
  registrationId: string | null
  stripeCheckoutSessionId: string
  amountCents: number
  currency: string
  status: string
  createdAt: string | null
}

type OrdersPayload = {
  storeOrders: StoreOrder[]
  eventPayments: EventPayment[]
}

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (amountCents == null) return '—'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency ?? 'usd').toUpperCase(),
    }).format(amountCents / 100)
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function badgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'paid') return 'bg-green-100 text-green-700'
  if (normalized === 'pending' || normalized === 'unpaid' || normalized === 'open') {
    return 'bg-amber-100 text-amber-800'
  }
  if (normalized === 'refunded') return 'bg-slate-200 text-slate-700'
  return 'bg-slate-100 text-slate-700'
}

export default function OrdersClient() {
  const [payload, setPayload] = useState<OrdersPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        const response = await fetch('/portal/api/orders', { cache: 'no-store' })
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body?.error ?? 'Failed to load order history')
        }

        const body = (await response.json()) as OrdersPayload
        if (!alive) return
        setPayload(body)
        setErr(null)
      } catch (error: any) {
        if (!alive) return
        setErr(error?.message ?? 'Failed to load order history')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return <main className="min-h-screen grid place-items-center p-10">Loading your order history…</main>
  }

  if (err) {
    return (
      <main className="min-h-screen grid place-items-center p-10">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-red-600">Couldn’t load your orders</h2>
          <p className="mt-2 text-sm text-gray-700">{err}</p>
          <p className="mt-4 text-sm">
            <Link href="/portal/dashboard" className="text-usaBlue hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    )
  }

  const storeOrders = payload?.storeOrders ?? []
  const eventPayments = payload?.eventPayments ?? []

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Portal Billing</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0A3161]">Orders & Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Review your store purchases and paid event registration history from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/shop" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            Shop Bags
          </Link>
          <Link href="/portal/events" className="rounded bg-[#0A3161] px-3 py-2 text-sm text-white hover:opacity-90">
            Find Events
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Store Orders</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{storeOrders.length}</p>
          <p className="mt-2 text-sm text-slate-600">Completed or persisted checkout sessions tied to your email.</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event Payments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{eventPayments.length}</p>
          <p className="mt-2 text-sm text-slate-600">Paid-registration attempts and settled event charges tied to your account.</p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0A3161]">Store Orders</h2>
          <span className="text-sm text-gray-500">{storeOrders.length} orders</span>
        </div>

        {storeOrders.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            No persisted store orders yet. Once a checkout completes and the webhook is delivered, your order history will appear here.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {storeOrders.map((order) => (
              <article key={order.id} className="rounded-xl border p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(order.totalAmount, order.currency)}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.itemCount} items · {formatTimestamp(order.createdAt)}</p>
                    <p className="mt-2 text-xs text-slate-500">Session {order.stripeSessionId}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <ul className="mt-4 divide-y rounded-lg border">
                  {order.items.map((item, index) => (
                    <li key={`${order.id}-${item.productSlug}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-slate-500">{item.productSlug}</p>
                      </div>
                      <div className="text-right text-slate-600">
                        <p>Qty {item.quantity}</p>
                        <p>{formatMoney(item.unitAmount, order.currency)} each</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0A3161]">Event Payments</h2>
          <span className="text-sm text-gray-500">{eventPayments.length} payments</span>
        </div>

        {eventPayments.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            No paid event registrations yet. Free events will still appear under{' '}
            <Link href="/portal/my-registrations" className="text-usaBlue hover:underline">
              My Registrations
            </Link>.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {eventPayments.map((payment) => (
              <article key={payment.id} className="rounded-xl border p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{payment.eventTitle}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatMoney(payment.amountCents, payment.currency)} · {formatTimestamp(payment.createdAt)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Session {payment.stripeCheckoutSessionId}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(payment.status)}`}>
                    {payment.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/portal/events/${payment.eventSlug ?? payment.eventId}`}
                    className="text-usaBlue hover:underline"
                  >
                    View event
                  </Link>
                  <Link href="/portal/my-registrations" className="text-usaBlue hover:underline">
                    View registrations
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
