import Stripe from 'stripe'
import { devStore } from '@/app/lib/devStore'
import { getPrisma } from '@/app/lib/safePrisma'
import { getWebhookDeliveryLogsModel } from '@/app/lib/prismaModels'
import { getStripeClient } from '@/app/lib/stripe'
import {
  logPaymentAction,
  persistEventRegistrationFromSession,
  persistStoreOrderFromSession,
} from '@/app/lib/paymentPersistence'

export type WebhookDeliverySummary = {
  id: string
  provider: string
  source: string
  route: string
  attemptKind: string
  eventType: string | null
  status: string
  stripeEventId: string | null
  stripeCheckoutSessionId: string | null
  stripePaymentIntentId: string | null
  eventId: string | null
  userId: string | null
  registrationId: string | null
  httpStatus: number | null
  errorMessage: string | null
  note: string | null
  retryParentLogId: string | null
  createdAt: string | null
  processedAt: string | null
  retryable: boolean
}

export type WebhookDeliveryStats = {
  total: number
  processed: number
  failed: number
  configIssues: number
  retryableFailures: number
}

type WebhookDeliveryLogInput = {
  provider?: string
  source: string
  route: string
  attemptKind?: string
  eventType?: string | null
  status: string
  stripeEventId?: string | null
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  eventId?: string | null
  userId?: string | null
  registrationId?: string | null
  httpStatus?: number | null
  errorMessage?: string | null
  note?: string | null
  retryParentLogId?: string | null
  processedAt?: string | Date | null
}

type WebhookDeliveryLogUpdate = {
  attemptKind?: string
  eventType?: string | null
  status?: string
  stripeEventId?: string | null
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  eventId?: string | null
  userId?: string | null
  registrationId?: string | null
  httpStatus?: number | null
  errorMessage?: string | null
  note?: string | null
  processedAt?: string | Date | null
}

type WebhookDeliveryRow = {
  id?: string
  provider?: string | null
  source: string
  route: string
  attempt_kind?: string | null
  event_type?: string | null
  status: string
  stripe_event_id?: string | null
  stripe_checkout_session_id?: string | null
  stripe_payment_intent_id?: string | null
  event_id?: string | null
  user_id?: string | null
  registration_id?: string | null
  http_status?: number | null
  error_message?: string | null
  note?: string | null
  retry_parent_log_id?: string | null
  created_at?: string | Date | null
  processed_at?: string | Date | null
}

function asIso(value: string | Date | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function isRetryable(row: WebhookDeliveryRow) {
  return (
    row.status !== 'processed' &&
    Boolean(row.stripe_checkout_session_id) &&
    (row.source === 'store_checkout' || row.source === 'event_registration')
  )
}

function toSummary(row: WebhookDeliveryRow): WebhookDeliverySummary {
  return {
    id: String(row.id),
    provider: row.provider ?? 'stripe',
    source: row.source,
    route: row.route,
    attemptKind: row.attempt_kind ?? 'live',
    eventType: row.event_type ?? null,
    status: row.status,
    stripeEventId: row.stripe_event_id ?? null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? null,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    eventId: row.event_id ?? null,
    userId: row.user_id ?? null,
    registrationId: row.registration_id ?? null,
    httpStatus: row.http_status ?? null,
    errorMessage: row.error_message ?? null,
    note: row.note ?? null,
    retryParentLogId: row.retry_parent_log_id ?? null,
    createdAt: asIso(row.created_at),
    processedAt: asIso(row.processed_at),
    retryable: isRetryable(row),
  }
}

function toRow(input: WebhookDeliveryLogInput | (WebhookDeliveryLogInput & { id: string })) {
  const withId = 'id' in input ? input.id : undefined
  return {
    ...(withId ? { id: withId } : {}),
    provider: input.provider ?? 'stripe',
    source: input.source,
    route: input.route,
    attempt_kind: input.attemptKind ?? 'live',
    event_type: input.eventType ?? null,
    status: input.status,
    stripe_event_id: input.stripeEventId ?? null,
    stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    event_id: input.eventId ?? null,
    user_id: input.userId ?? null,
    registration_id: input.registrationId ?? null,
    http_status: input.httpStatus ?? null,
    error_message: input.errorMessage ?? null,
    note: input.note ?? null,
    retry_parent_log_id: input.retryParentLogId ?? null,
    processed_at: asIso(input.processedAt),
  }
}

async function getWebhookDeliveryModel() {
  const prisma = await getPrisma()
  return {
    prisma,
    WebhookDeliveryLogs: prisma ? getWebhookDeliveryLogsModel(prisma) : null,
  }
}

export async function createWebhookDeliveryLog(input: WebhookDeliveryLogInput) {
  const { prisma, WebhookDeliveryLogs } = await getWebhookDeliveryModel()

  if (prisma && WebhookDeliveryLogs) {
    try {
      const row = await WebhookDeliveryLogs.create({ data: toRow(input) })
      return String(row.id)
    } catch {
      // fall through to dev fallback when migrations are not yet applied
    }
  }

  const row = devStore.upsert<WebhookDeliveryRow>('webhook_delivery_logs', {
    ...toRow(input),
    created_at: new Date().toISOString(),
  })
  return String(row.id)
}

export async function updateWebhookDeliveryLog(id: string, update: WebhookDeliveryLogUpdate) {
  const { prisma, WebhookDeliveryLogs } = await getWebhookDeliveryModel()

  if (prisma && WebhookDeliveryLogs) {
    try {
      const row = await WebhookDeliveryLogs.update({
        where: { id },
        data: {
          ...(update.attemptKind !== undefined ? { attempt_kind: update.attemptKind } : {}),
          ...(update.eventType !== undefined ? { event_type: update.eventType } : {}),
          ...(update.status !== undefined ? { status: update.status } : {}),
          ...(update.stripeEventId !== undefined ? { stripe_event_id: update.stripeEventId } : {}),
          ...(update.stripeCheckoutSessionId !== undefined
            ? { stripe_checkout_session_id: update.stripeCheckoutSessionId }
            : {}),
          ...(update.stripePaymentIntentId !== undefined
            ? { stripe_payment_intent_id: update.stripePaymentIntentId }
            : {}),
          ...(update.eventId !== undefined ? { event_id: update.eventId } : {}),
          ...(update.userId !== undefined ? { user_id: update.userId } : {}),
          ...(update.registrationId !== undefined ? { registration_id: update.registrationId } : {}),
          ...(update.httpStatus !== undefined ? { http_status: update.httpStatus } : {}),
          ...(update.errorMessage !== undefined ? { error_message: update.errorMessage } : {}),
          ...(update.note !== undefined ? { note: update.note } : {}),
          ...(update.processedAt !== undefined ? { processed_at: asIso(update.processedAt) } : {}),
        },
      })
      return toSummary(row as WebhookDeliveryRow)
    } catch {
      // fall back below
    }
  }

  const current = devStore.getById<WebhookDeliveryRow>('webhook_delivery_logs', id)
  if (!current) return null
  const row = devStore.upsert<WebhookDeliveryRow>('webhook_delivery_logs', {
    ...current,
    ...(update.attemptKind !== undefined ? { attempt_kind: update.attemptKind } : {}),
    ...(update.eventType !== undefined ? { event_type: update.eventType } : {}),
    ...(update.status !== undefined ? { status: update.status } : {}),
    ...(update.stripeEventId !== undefined ? { stripe_event_id: update.stripeEventId } : {}),
    ...(update.stripeCheckoutSessionId !== undefined
      ? { stripe_checkout_session_id: update.stripeCheckoutSessionId }
      : {}),
    ...(update.stripePaymentIntentId !== undefined
      ? { stripe_payment_intent_id: update.stripePaymentIntentId }
      : {}),
    ...(update.eventId !== undefined ? { event_id: update.eventId } : {}),
    ...(update.userId !== undefined ? { user_id: update.userId } : {}),
    ...(update.registrationId !== undefined ? { registration_id: update.registrationId } : {}),
    ...(update.httpStatus !== undefined ? { http_status: update.httpStatus } : {}),
    ...(update.errorMessage !== undefined ? { error_message: update.errorMessage } : {}),
    ...(update.note !== undefined ? { note: update.note } : {}),
    ...(update.processedAt !== undefined ? { processed_at: asIso(update.processedAt) } : {}),
  })
  return toSummary(row)
}

export async function getWebhookDeliveryLogById(id: string) {
  const { prisma, WebhookDeliveryLogs } = await getWebhookDeliveryModel()

  if (prisma && WebhookDeliveryLogs) {
    try {
      const row = await WebhookDeliveryLogs.findUnique({ where: { id } })
      return row ? toSummary(row as WebhookDeliveryRow) : null
    } catch {
      // fall through
    }
  }

  const row = devStore.getById<WebhookDeliveryRow>('webhook_delivery_logs', id)
  return row ? toSummary(row) : null
}

export async function listRecentWebhookDeliveryLogs(limit = 20): Promise<WebhookDeliverySummary[]> {
  const { prisma, WebhookDeliveryLogs } = await getWebhookDeliveryModel()

  if (prisma && WebhookDeliveryLogs) {
    try {
      const rows = await WebhookDeliveryLogs.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
      })
      return (rows as WebhookDeliveryRow[]).map(toSummary)
    } catch {
      // fall through
    }
  }

  return devStore
    .getAll<WebhookDeliveryRow>('webhook_delivery_logs')
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
    .slice(0, limit)
    .map(toSummary)
}

export async function getWebhookDeliveryStats(): Promise<WebhookDeliveryStats> {
  const rows = await listRecentWebhookDeliveryLogs(200)

  return {
    total: rows.length,
    processed: rows.filter((row) => row.status === 'processed').length,
    failed: rows.filter((row) => row.status === 'failed').length,
    configIssues: rows.filter((row) => row.status === 'config_missing').length,
    retryableFailures: rows.filter((row) => row.retryable).length,
  }
}

export async function hasWebhookDeliveryPersistence() {
  const { prisma, WebhookDeliveryLogs } = await getWebhookDeliveryModel()
  if (!prisma) return true

  if (!WebhookDeliveryLogs) return false

  try {
    await WebhookDeliveryLogs.count()
    return true
  } catch {
    return false
  }
}

function getSessionPaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id
}

export async function retryWebhookDeliveryLogById(
  id: string,
  actor?: { userId?: string | null; role?: string | null },
) {
  const existing = await getWebhookDeliveryLogById(id)
  if (!existing) throw new Error('Webhook log not found.')
  if (!existing.retryable || !existing.stripeCheckoutSessionId) {
    throw new Error('This webhook log is not retryable.')
  }

  const stripe = getStripeClient()
  if (!stripe) throw new Error('Stripe is not configured in this environment.')

  const retryLogId = await createWebhookDeliveryLog({
    provider: existing.provider,
    source: existing.source,
    route: existing.route,
    attemptKind: 'manual_retry',
    eventType: existing.eventType,
    status: 'received',
    stripeEventId: existing.stripeEventId,
    stripeCheckoutSessionId: existing.stripeCheckoutSessionId,
    stripePaymentIntentId: existing.stripePaymentIntentId,
    eventId: existing.eventId,
    userId: existing.userId,
    registrationId: existing.registrationId,
    note: 'Manual retry requested from portal admin.',
    retryParentLogId: existing.id,
  })

  try {
    const session = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId, {
      expand: ['payment_intent'],
    })

    if (existing.source === 'store_checkout') {
      const stored = await persistStoreOrderFromSession(stripe, session)
      if (!stored) throw new Error('Store checkout session could not be persisted.')
    } else if (existing.source === 'event_registration') {
      const stored = await persistEventRegistrationFromSession(session)
      if (!stored) throw new Error('Event registration session could not be persisted.')
    } else {
      throw new Error('Unsupported webhook source for retry.')
    }

    const processed = await updateWebhookDeliveryLog(retryLogId, {
      status: 'processed',
      httpStatus: 200,
      stripePaymentIntentId: getSessionPaymentIntentId(session),
      processedAt: new Date().toISOString(),
      note: 'Manual retry succeeded.',
    })

    await logPaymentAction({
      kind: 'webhook_delivery',
      action: 'retry',
      targetId: existing.id,
      actorUserId: actor?.userId ?? null,
      actorRole: actor?.role ?? null,
      eventId: existing.eventId,
      paymentId: existing.id,
      registrationId: existing.registrationId,
      statusBefore: existing.status,
      statusAfter: processed?.status ?? 'processed',
      note: `Manual retry created log ${retryLogId}.`,
    })

    return processed
  } catch (error: any) {
    await updateWebhookDeliveryLog(retryLogId, {
      status: 'failed',
      httpStatus: 500,
      errorMessage: error?.message ?? 'Manual retry failed.',
      processedAt: new Date().toISOString(),
      note: 'Manual retry failed.',
    })
    throw error
  }
}
