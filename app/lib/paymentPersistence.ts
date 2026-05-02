import Stripe from 'stripe'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import {
  getEventRegistrationPaymentsModel,
  getStoreOrderItemsModel,
  getStoreOrdersModel,
} from '@/app/lib/prismaModels'

export type StoreOrderSummary = {
  id: string
  stripeSessionId: string
  email: string | null
  status: string
  currency: string
  subtotalAmount: number
  totalAmount: number
  itemCount: number
  createdAt: string | null
}

export type StoreOrderItemSummary = {
  productSlug: string
  title: string
  unitAmount: number
  quantity: number
}

export type StoreOrderDetail = StoreOrderSummary & {
  items: StoreOrderItemSummary[]
}

export type StoreOrderRecord = StoreOrderDetail & {
  stripePaymentId: string | null
}

export type EventPaymentSummary = {
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

export type EventPaymentRecord = EventPaymentSummary & {
  stripePaymentIntentId: string | null
}

export type PaymentOverviewTotals = {
  storeOrderCount: number
  refundedStoreOrderCount: number
  storeRevenueCents: number
  eventPaymentCount: number
  paidEventPaymentCount: number
  pendingEventPaymentCount: number
  refundedEventPaymentCount: number
  cancelledEventPaymentCount: number
  eventRevenueCents: number
}

type UpdateStoreOrderInput = {
  status?: string
}

type UpdateEventPaymentInput = {
  status?: string
  registrationId?: string | null
}

type StoreOrderLine = {
  productSlug: string
  title: string
  unitAmount: number
  quantity: number
}

type EventPaymentPersistInput = {
  eventId: string
  userId: string
  registrationId?: string | null
  stripeCheckoutSessionId: string
  stripePaymentIntentId?: string | null
  amountCents: number
  currency: string
  status: string
}

type PaymentUserSummary = {
  name: string
  email: string | null
}

function asIso(value: string | Date | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function isPaidLikeStatus(value: string | null | undefined) {
  if (!value) return false
  return new Set(['paid', 'complete', 'completed', 'succeeded']).has(value.toLowerCase())
}

export function isRefundedLikeStatus(value: string | null | undefined) {
  if (!value) return false
  return new Set(['refunded', 'refund_pending']).has(value.toLowerCase())
}

function isPendingLikeStatus(value: string | null | undefined) {
  if (!value) return false
  return new Set(['pending', 'open', 'unpaid']).has(value.toLowerCase())
}

function isCancelledLikeStatus(value: string | null | undefined) {
  if (!value) return false
  return new Set(['cancelled', 'canceled', 'expired', 'failed']).has(value.toLowerCase())
}

function normalizeStripeId(value: string | Stripe.PaymentIntent | null | undefined) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

function slugFromLineItem(lineItem: Stripe.LineItem, index: number) {
  const expandedProduct =
    lineItem.price?.product && typeof lineItem.price.product !== 'string'
      ? (lineItem.price.product as Stripe.Product)
      : null

  const rawSlug =
    expandedProduct?.metadata?.slug ??
    lineItem.price?.metadata?.slug ??
    lineItem.description ??
    `store-item-${index + 1}`

  return rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getStoreModels() {
  const prisma = await getPrisma()
  return {
    prisma,
    StoreOrders: prisma ? getStoreOrdersModel(prisma) : null,
    StoreOrderItems: prisma ? getStoreOrderItemsModel(prisma) : null,
  }
}

async function getEventPaymentModels() {
  const prisma = await getPrisma()
  return {
    prisma,
    EventRegistrationPayments: prisma ? getEventRegistrationPaymentsModel(prisma) : null,
  }
}

function mapStoreOrderItems(rows: any[]) {
  return rows.map((item) => ({
    productSlug: item.product_slug,
    title: item.title,
    unitAmount: item.unit_amount ?? 0,
    quantity: item.quantity ?? 0,
  }))
}

function mapStoreOrderRecord(row: any, items: StoreOrderItemSummary[]): StoreOrderRecord {
  return {
    id: row.id,
    stripeSessionId: row.stripe_session_id,
    stripePaymentId: row.stripe_payment_id ?? null,
    email: row.email ?? null,
    status: row.status,
    currency: row.currency ?? 'usd',
    subtotalAmount: row.subtotal_amount ?? 0,
    totalAmount: row.total_amount ?? 0,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    createdAt: asIso(row.created_at),
    items,
  }
}

export async function persistStoreOrderFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.metadata?.source !== 'nco-store-mvp') return false

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  })

  const items: StoreOrderLine[] = lineItems.data.map((lineItem, index) => ({
    productSlug: slugFromLineItem(lineItem, index),
    title: lineItem.description ?? 'Store Item',
    unitAmount:
      lineItem.price?.unit_amount ??
      (lineItem.quantity && lineItem.amount_total != null
        ? Math.round(lineItem.amount_total / Math.max(1, lineItem.quantity))
        : 0),
    quantity: lineItem.quantity ?? 1,
  }))

  const { prisma, StoreOrders, StoreOrderItems } = await getStoreModels()

  if (prisma && StoreOrders && StoreOrderItems) {
    const existing = await StoreOrders.findUnique({
      where: { stripe_session_id: session.id },
      select: { id: true },
    }).catch(() => null)

    const order = existing
      ? await StoreOrders.update({
          where: { id: existing.id },
          data: {
            stripe_payment_id: normalizeStripeId(session.payment_intent),
            email: session.customer_details?.email ?? session.customer_email ?? null,
            status: session.payment_status ?? session.status ?? 'paid',
            currency: session.currency ?? 'usd',
            subtotal_amount: session.amount_subtotal ?? session.amount_total ?? 0,
            total_amount: session.amount_total ?? 0,
          },
        })
      : await StoreOrders.create({
          data: {
            stripe_session_id: session.id,
            stripe_payment_id: normalizeStripeId(session.payment_intent),
            email: session.customer_details?.email ?? session.customer_email ?? null,
            status: session.payment_status ?? session.status ?? 'paid',
            currency: session.currency ?? 'usd',
            subtotal_amount: session.amount_subtotal ?? session.amount_total ?? 0,
            total_amount: session.amount_total ?? 0,
          },
        })

    await StoreOrderItems.deleteMany({ where: { order_id: order.id } })
    for (const item of items) {
      await StoreOrderItems.create({
        data: {
          order_id: order.id,
          product_slug: item.productSlug,
          title: item.title,
          unit_amount: item.unitAmount,
          quantity: item.quantity,
        },
      })
    }

    return true
  }

  const existing = devStore
    .getAll<any>('store_orders')
    .find((order) => order.stripe_session_id === session.id)
  const saved = devStore.upsert('store_orders', {
    ...(existing ?? {}),
    stripe_session_id: session.id,
    stripe_payment_id: normalizeStripeId(session.payment_intent),
    email: session.customer_details?.email ?? session.customer_email ?? null,
    status: session.payment_status ?? session.status ?? 'paid',
    currency: session.currency ?? 'usd',
    subtotal_amount: session.amount_subtotal ?? session.amount_total ?? 0,
    total_amount: session.amount_total ?? 0,
    created_at: existing?.created_at ?? new Date().toISOString(),
  })

  for (const row of devStore.getAll<any>('store_order_items')) {
    if (row.order_id === saved.id && row.id) {
      devStore.remove('store_order_items', row.id)
    }
  }
  for (const item of items) {
    devStore.upsert('store_order_items', {
      order_id: saved.id,
      product_slug: item.productSlug,
      title: item.title,
      unit_amount: item.unitAmount,
      quantity: item.quantity,
      created_at: new Date().toISOString(),
    })
  }

  return true
}

export async function upsertEventRegistrationPayment(input: EventPaymentPersistInput) {
  const { prisma, EventRegistrationPayments } = await getEventPaymentModels()

  if (prisma && EventRegistrationPayments) {
    const existing = await EventRegistrationPayments.findUnique({
      where: { stripe_checkout_session_id: input.stripeCheckoutSessionId },
      select: { id: true },
    }).catch(() => null)

    if (existing) {
      await EventRegistrationPayments.update({
        where: { id: existing.id },
        data: {
          event_id: input.eventId,
          user_id: input.userId,
          registration_id: input.registrationId ?? null,
          stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
          amount_cents: input.amountCents,
          currency: input.currency,
          status: input.status,
        },
      })
      return true
    }

    await EventRegistrationPayments.create({
      data: {
        event_id: input.eventId,
        user_id: input.userId,
        registration_id: input.registrationId ?? null,
        stripe_checkout_session_id: input.stripeCheckoutSessionId,
        stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
        amount_cents: input.amountCents,
        currency: input.currency,
        status: input.status,
      },
    })
    return true
  }

  const existing = devStore
    .getAll<any>('event_registration_payments')
    .find((row) => row.stripe_checkout_session_id === input.stripeCheckoutSessionId)

  devStore.upsert('event_registration_payments', {
    ...(existing ?? {}),
    event_id: input.eventId,
    user_id: input.userId,
    registration_id: input.registrationId ?? null,
    stripe_checkout_session_id: input.stripeCheckoutSessionId,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    amount_cents: input.amountCents,
    currency: input.currency,
    status: input.status,
    created_at: existing?.created_at ?? new Date().toISOString(),
  })

  return true
}

export async function listRecentStoreOrders(limit = 10): Promise<StoreOrderSummary[]> {
  const { prisma, StoreOrders, StoreOrderItems } = await getStoreModels()

  if (prisma && StoreOrders && StoreOrderItems) {
    try {
      const rows = await StoreOrders.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      const counts = new Map<string, number>()
      if (rows.length > 0) {
        const items = await StoreOrderItems.findMany({
          where: { order_id: { in: rows.map((row: any) => row.id) } },
          select: { order_id: true, quantity: true },
        })
        for (const item of items) {
          counts.set(item.order_id, (counts.get(item.order_id) ?? 0) + Number(item.quantity ?? 0))
        }
      }

      return rows.map((row: any) => ({
        id: row.id,
        stripeSessionId: row.stripe_session_id,
        email: row.email ?? null,
        status: row.status,
        currency: row.currency,
        subtotalAmount: row.subtotal_amount,
        totalAmount: row.total_amount,
        itemCount: counts.get(row.id) ?? 0,
        createdAt: asIso(row.created_at),
      }))
    } catch {
      return []
    }
  }

  return devStore
    .getAll<any>('store_orders')
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
    .slice(0, limit)
    .map((row) => {
      const itemCount = devStore
        .getAll<any>('store_order_items')
        .filter((item) => item.order_id === row.id)
        .reduce((total, item) => total + Number(item.quantity ?? 0), 0)

      return {
        id: row.id,
        stripeSessionId: row.stripe_session_id,
        email: row.email ?? null,
        status: row.status,
        currency: row.currency ?? 'usd',
        subtotalAmount: row.subtotal_amount ?? 0,
        totalAmount: row.total_amount ?? 0,
        itemCount,
        createdAt: asIso(row.created_at),
      }
    })
}

export async function listStoreOrdersByEmail(email: string, limit = 20): Promise<StoreOrderDetail[]> {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return []

  const { prisma, StoreOrders, StoreOrderItems } = await getStoreModels()

  if (prisma && StoreOrders && StoreOrderItems) {
    try {
      const rows = await StoreOrders.findMany({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      const itemsByOrder = new Map<string, StoreOrderItemSummary[]>()
      if (rows.length > 0) {
        const items = await StoreOrderItems.findMany({
          where: { order_id: { in: rows.map((row: any) => row.id) } },
          orderBy: { created_at: 'asc' },
        })

        for (const item of items as any[]) {
          const current = itemsByOrder.get(item.order_id) ?? []
          current.push({
            productSlug: item.product_slug,
            title: item.title,
            unitAmount: item.unit_amount,
            quantity: item.quantity,
          })
          itemsByOrder.set(item.order_id, current)
        }
      }

      return rows.map((row: any) => {
        const items = itemsByOrder.get(row.id) ?? []
        return {
          id: row.id,
          stripeSessionId: row.stripe_session_id,
          email: row.email ?? null,
          status: row.status,
          currency: row.currency,
          subtotalAmount: row.subtotal_amount,
          totalAmount: row.total_amount,
          itemCount: items.reduce((total, item) => total + item.quantity, 0),
          createdAt: asIso(row.created_at),
          items,
        }
      })
    } catch {
      return []
    }
  }

  return devStore
    .getAll<any>('store_orders')
    .filter((row) => normalizeEmail(row.email) === normalizedEmail)
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
    .slice(0, limit)
    .map((row) => {
      const items = devStore
        .getAll<any>('store_order_items')
        .filter((item) => item.order_id === row.id)
        .sort((a, b) => (asIso(a.created_at) ?? '').localeCompare(asIso(b.created_at) ?? ''))
        .map((item) => ({
          productSlug: item.product_slug,
          title: item.title,
          unitAmount: item.unit_amount ?? 0,
          quantity: item.quantity ?? 0,
        }))

      return {
        id: row.id,
        stripeSessionId: row.stripe_session_id,
        email: row.email ?? null,
        status: row.status,
        currency: row.currency ?? 'usd',
        subtotalAmount: row.subtotal_amount ?? 0,
        totalAmount: row.total_amount ?? 0,
        itemCount: items.reduce((total, item) => total + item.quantity, 0),
        createdAt: asIso(row.created_at),
        items,
      }
    })
}

export async function getStoreOrderById(id: string): Promise<StoreOrderRecord | null> {
  if (!id) return null

  const { prisma, StoreOrders, StoreOrderItems } = await getStoreModels()

  if (prisma && StoreOrders && StoreOrderItems) {
    try {
      const row = await StoreOrders.findUnique({
        where: { id },
      })
      if (!row) return null

      const items = await StoreOrderItems.findMany({
        where: { order_id: id },
        orderBy: { created_at: 'asc' },
      })

      return mapStoreOrderRecord(row, mapStoreOrderItems(items as any[]))
    } catch {
      return null
    }
  }

  const row = devStore.getById<any>('store_orders', id)
  if (!row) return null

  const items = devStore
    .getAll<any>('store_order_items')
    .filter((item) => item.order_id === id)
    .sort((a, b) => (asIso(a.created_at) ?? '').localeCompare(asIso(b.created_at) ?? ''))

  return mapStoreOrderRecord(row, mapStoreOrderItems(items))
}

export async function updateStoreOrder(id: string, patch: UpdateStoreOrderInput) {
  const { prisma, StoreOrders } = await getStoreModels()

  if (prisma && StoreOrders) {
    try {
      const updated = await StoreOrders.update({
        where: { id },
        data: {
          ...(patch.status ? { status: patch.status } : {}),
        },
      })
      return updated ? getStoreOrderById(id) : null
    } catch {
      return null
    }
  }

  const current = devStore.getById<any>('store_orders', id)
  if (!current) return null

  devStore.upsert('store_orders', {
    ...current,
    ...(patch.status ? { status: patch.status } : {}),
  })

  return getStoreOrderById(id)
}

export async function listRecentEventRegistrationPayments(limit = 10): Promise<EventPaymentSummary[]> {
  const prisma = await getPrisma()
  const EventRegistrationPayments = prisma ? getEventRegistrationPaymentsModel(prisma) : null

  if (prisma && EventRegistrationPayments) {
    try {
      const rows = await EventRegistrationPayments.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
      })
      const eventIds = Array.from(new Set(rows.map((row: any) => row.event_id)))
      const userIds = Array.from(new Set(rows.map((row: any) => row.user_id)))

      const [events, users] = await Promise.all([
        prisma.events.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, slug: true },
        }),
        prisma.users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        }),
      ])

      const eventMap = new Map<string, { title: string; slug: string | null }>(
        events.map((event: any) => [event.id, { title: event.title ?? 'Untitled Event', slug: event.slug ?? null }]),
      )
      const userMap = new Map<string, PaymentUserSummary>(
        users.map((user: any) => [user.id, { name: user.name ?? user.email ?? user.id, email: user.email ?? null }]),
      )

      return rows.map((row: any) => ({
        id: row.id,
        eventId: row.event_id,
        eventTitle: eventMap.get(row.event_id)?.title ?? 'Untitled Event',
        eventSlug: eventMap.get(row.event_id)?.slug ?? null,
        userId: row.user_id,
        userName: userMap.get(row.user_id)?.name ?? row.user_id,
        email: userMap.get(row.user_id)?.email ?? null,
        registrationId: row.registration_id ?? null,
        stripeCheckoutSessionId: row.stripe_checkout_session_id,
        amountCents: row.amount_cents,
        currency: row.currency,
        status: row.status,
        createdAt: asIso(row.created_at),
      }))
    } catch {
      return []
    }
  }

  const eventMap = new Map<string, { title: string; slug: string | null }>(
    devStore
      .getAll<any>('events')
      .map((event) => [event.id, { title: event.title ?? 'Untitled Event', slug: event.slug ?? null }]),
  )
  const userMap = new Map<string, PaymentUserSummary>(
    devStore.getAll<any>('users').map((user) => [user.id, { name: user.name ?? user.email ?? user.id, email: user.email ?? null }]),
  )

  return devStore
    .getAll<any>('event_registration_payments')
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      eventId: row.event_id,
      eventTitle: eventMap.get(row.event_id)?.title ?? 'Untitled Event',
      eventSlug: eventMap.get(row.event_id)?.slug ?? null,
      userId: row.user_id,
      userName: userMap.get(row.user_id)?.name ?? row.user_id,
      email: userMap.get(row.user_id)?.email ?? null,
      registrationId: row.registration_id ?? null,
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      amountCents: row.amount_cents ?? 0,
      currency: row.currency ?? 'usd',
      status: row.status ?? 'pending',
      createdAt: asIso(row.created_at),
    }))
}

export async function listEventRegistrationPaymentsByUserId(
  userId: string,
  limit = 20,
): Promise<EventPaymentSummary[]> {
  if (!userId) return []

  const prisma = await getPrisma()
  const EventRegistrationPayments = prisma ? getEventRegistrationPaymentsModel(prisma) : null

  if (prisma && EventRegistrationPayments) {
    try {
      const rows = await EventRegistrationPayments.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      const eventIds = Array.from(new Set(rows.map((row: any) => row.event_id)))
      const [events, user] = await Promise.all([
        prisma.events.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, slug: true },
        }),
        prisma.users.findFirst({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        }),
      ])

      const eventMap = new Map<string, { title: string; slug: string | null }>(
        events.map((event: any) => [event.id, { title: event.title ?? 'Untitled Event', slug: event.slug ?? null }]),
      )
      const userName = user?.name ?? user?.email ?? userId
      const email = user?.email ?? null

      return rows.map((row: any) => ({
        id: row.id,
        eventId: row.event_id,
        eventTitle: eventMap.get(row.event_id)?.title ?? 'Untitled Event',
        eventSlug: eventMap.get(row.event_id)?.slug ?? null,
        userId: row.user_id,
        userName,
        email,
        registrationId: row.registration_id ?? null,
        stripeCheckoutSessionId: row.stripe_checkout_session_id,
        amountCents: row.amount_cents,
        currency: row.currency,
        status: row.status,
        createdAt: asIso(row.created_at),
      }))
    } catch {
      return []
    }
  }

  const eventMap = new Map<string, { title: string; slug: string | null }>(
    devStore
      .getAll<any>('events')
      .map((event) => [event.id, { title: event.title ?? 'Untitled Event', slug: event.slug ?? null }]),
  )
  const user = devStore.getAll<any>('users').find((row) => row.id === userId)

  return devStore
    .getAll<any>('event_registration_payments')
    .filter((row) => row.user_id === userId)
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      eventId: row.event_id,
      eventTitle: eventMap.get(row.event_id)?.title ?? 'Untitled Event',
      eventSlug: eventMap.get(row.event_id)?.slug ?? null,
      userId: row.user_id,
      userName: user?.name ?? user?.email ?? row.user_id,
      email: user?.email ?? null,
      registrationId: row.registration_id ?? null,
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      amountCents: row.amount_cents ?? 0,
      currency: row.currency ?? 'usd',
      status: row.status ?? 'pending',
      createdAt: asIso(row.created_at),
    }))
}

function mapEventPaymentRecord(
  row: any,
  eventMap: Map<string, { title: string; slug: string | null }>,
  userName: string,
  email: string | null,
): EventPaymentRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: eventMap.get(row.event_id)?.title ?? 'Untitled Event',
    eventSlug: eventMap.get(row.event_id)?.slug ?? null,
    userId: row.user_id,
    userName,
    email,
    registrationId: row.registration_id ?? null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    amountCents: row.amount_cents ?? 0,
    currency: row.currency ?? 'usd',
    status: row.status ?? 'pending',
    createdAt: asIso(row.created_at),
  }
}

export async function getEventRegistrationPaymentById(id: string): Promise<EventPaymentRecord | null> {
  if (!id) return null

  const prisma = await getPrisma()
  const EventRegistrationPayments = prisma ? getEventRegistrationPaymentsModel(prisma) : null

  if (prisma && EventRegistrationPayments) {
    try {
      const row = await EventRegistrationPayments.findUnique({
        where: { id },
      })
      if (!row) return null

      const [event, user] = await Promise.all([
        prisma.events.findFirst({
          where: { id: row.event_id },
          select: { id: true, title: true, slug: true },
        }),
        prisma.users.findFirst({
          where: { id: row.user_id },
          select: { id: true, name: true, email: true },
        }),
      ])

      const eventMap = new Map<string, { title: string; slug: string | null }>()
      if (event) {
        eventMap.set(event.id, { title: event.title ?? 'Untitled Event', slug: event.slug ?? null })
      }

      return mapEventPaymentRecord(
        row,
        eventMap,
        user?.name ?? user?.email ?? row.user_id,
        user?.email ?? null,
      )
    } catch {
      return null
    }
  }

  const row = devStore.getById<any>('event_registration_payments', id)
  if (!row) return null

  const event = devStore.getAll<any>('events').find((item) => item.id === row.event_id)
  const user = devStore.getAll<any>('users').find((item) => item.id === row.user_id)
  const eventMap = new Map<string, { title: string; slug: string | null }>()
  if (event) {
    eventMap.set(event.id, { title: event.title ?? 'Untitled Event', slug: event.slug ?? null })
  }

  return mapEventPaymentRecord(
    row,
    eventMap,
    user?.name ?? user?.email ?? row.user_id,
    user?.email ?? null,
  )
}

export async function updateEventRegistrationPayment(id: string, patch: UpdateEventPaymentInput) {
  const { prisma, EventRegistrationPayments } = await getEventPaymentModels()

  if (prisma && EventRegistrationPayments) {
    try {
      await EventRegistrationPayments.update({
        where: { id },
        data: {
          ...(patch.status ? { status: patch.status } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'registrationId')
            ? { registration_id: patch.registrationId ?? null }
            : {}),
        },
      })

      return getEventRegistrationPaymentById(id)
    } catch {
      return null
    }
  }

  const current = devStore.getById<any>('event_registration_payments', id)
  if (!current) return null

  devStore.upsert('event_registration_payments', {
    ...current,
    ...(patch.status ? { status: patch.status } : {}),
    ...(Object.prototype.hasOwnProperty.call(patch, 'registrationId')
      ? { registration_id: patch.registrationId ?? null }
      : {}),
  })

  return getEventRegistrationPaymentById(id)
}

export async function removeRegistrationRecord(registrationId: string) {
  if (!registrationId) return false

  const prisma = await getPrisma()
  if (prisma) {
    try {
      const deleted = await prisma.registrations.deleteMany({
        where: { id: registrationId },
      })
      return deleted.count > 0
    } catch {
      return false
    }
  }

  return devStore.remove('registrations', registrationId)
}

export async function getPaymentOverviewTotals(): Promise<PaymentOverviewTotals> {
  const prisma = await getPrisma()
  const defaultTotals: PaymentOverviewTotals = {
    storeOrderCount: 0,
    refundedStoreOrderCount: 0,
    storeRevenueCents: 0,
    eventPaymentCount: 0,
    paidEventPaymentCount: 0,
    pendingEventPaymentCount: 0,
    refundedEventPaymentCount: 0,
    cancelledEventPaymentCount: 0,
    eventRevenueCents: 0,
  }

  if (prisma) {
    try {
      const StoreOrders = getStoreOrdersModel(prisma)
      const EventRegistrationPayments = getEventRegistrationPaymentsModel(prisma)
      if (!StoreOrders || !EventRegistrationPayments) return defaultTotals

      const [orders, payments] = await Promise.all([
        StoreOrders.findMany({
          select: { total_amount: true, status: true },
        }),
        EventRegistrationPayments.findMany({
          select: { amount_cents: true, status: true },
        }),
      ])

      const refundedOrders = (orders as any[]).filter((row) => isRefundedLikeStatus(row.status))
      const activeOrders = (orders as any[]).filter((row) => !isRefundedLikeStatus(row.status))
      const paidEventPayments = (payments as any[]).filter((row) => isPaidLikeStatus(row.status))
      const pendingEventPayments = (payments as any[]).filter((row) => isPendingLikeStatus(row.status))
      const refundedEventPayments = (payments as any[]).filter((row) => isRefundedLikeStatus(row.status))
      const cancelledEventPayments = (payments as any[]).filter((row) => isCancelledLikeStatus(row.status))

      return {
        storeOrderCount: orders.length,
        refundedStoreOrderCount: refundedOrders.length,
        storeRevenueCents: activeOrders.reduce((total, row) => total + Number(row.total_amount ?? 0), 0),
        eventPaymentCount: payments.length,
        paidEventPaymentCount: paidEventPayments.length,
        pendingEventPaymentCount: pendingEventPayments.length,
        refundedEventPaymentCount: refundedEventPayments.length,
        cancelledEventPaymentCount: cancelledEventPayments.length,
        eventRevenueCents: paidEventPayments.reduce((total, row) => total + Number(row.amount_cents ?? 0), 0),
      }
    } catch {
      return defaultTotals
    }
  }

  const orders = devStore.getAll<any>('store_orders')
  const payments = devStore.getAll<any>('event_registration_payments')
  const paidEventPayments = payments.filter((row) => isPaidLikeStatus(row.status))
  const pendingEventPayments = payments.filter((row) => isPendingLikeStatus(row.status))
  const refundedOrders = orders.filter((row) => isRefundedLikeStatus(row.status))
  const activeOrders = orders.filter((row) => !isRefundedLikeStatus(row.status))
  const refundedEventPayments = payments.filter((row) => isRefundedLikeStatus(row.status))
  const cancelledEventPayments = payments.filter((row) => isCancelledLikeStatus(row.status))

  return {
    storeOrderCount: orders.length,
    refundedStoreOrderCount: refundedOrders.length,
    storeRevenueCents: activeOrders.reduce((total, row) => total + Number(row.total_amount ?? 0), 0),
    eventPaymentCount: payments.length,
    paidEventPaymentCount: paidEventPayments.length,
    pendingEventPaymentCount: pendingEventPayments.length,
    refundedEventPaymentCount: refundedEventPayments.length,
    cancelledEventPaymentCount: cancelledEventPayments.length,
    eventRevenueCents: paidEventPayments.reduce((total, row) => total + Number(row.amount_cents ?? 0), 0),
  }
}

export async function getPersistenceCapabilities() {
  const prisma = await getPrisma()
  if (!prisma) {
    return {
      storeOrderPersistence: true,
      eventPaymentPersistence: true,
    }
  }

  try {
    const StoreOrders = getStoreOrdersModel(prisma)
    const EventRegistrationPayments = getEventRegistrationPaymentsModel(prisma)
    if (!StoreOrders || !EventRegistrationPayments) {
      return {
        storeOrderPersistence: false,
        eventPaymentPersistence: false,
      }
    }

    await Promise.all([
      StoreOrders.count(),
      EventRegistrationPayments.count(),
    ])

    return {
      storeOrderPersistence: true,
      eventPaymentPersistence: true,
    }
  } catch {
    return {
      storeOrderPersistence: false,
      eventPaymentPersistence: false,
    }
  }
}
