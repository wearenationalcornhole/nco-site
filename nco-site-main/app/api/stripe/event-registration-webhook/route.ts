export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/app/lib/stripe'
import { getStripeWebhookSecret } from '@/app/lib/eventRegistration'
import { isEventRegistrationSession, persistEventRegistrationFromSession } from '@/app/lib/paymentPersistence'
import { createWebhookDeliveryLog, updateWebhookDeliveryLog } from '@/app/lib/webhookDeliveries'

function getCheckoutSession(event: Stripe.Event) {
  if (event.data.object.object !== 'checkout.session') return null
  return event.data.object as Stripe.Checkout.Session
}

export async function POST(req: Request) {
  const stripe = getStripeClient()
  const webhookSecret = getStripeWebhookSecret()

  if (!stripe || !webhookSecret) {
    await createWebhookDeliveryLog({
      source: 'event_registration',
      route: '/api/stripe/event-registration-webhook',
      status: 'config_missing',
      httpStatus: 503,
      errorMessage: 'Stripe webhook is not configured.',
    })
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    await createWebhookDeliveryLog({
      source: 'event_registration',
      route: '/api/stripe/event-registration-webhook',
      status: 'failed',
      httpStatus: 400,
      errorMessage: 'Missing Stripe signature',
    })
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (e: any) {
    await createWebhookDeliveryLog({
      source: 'event_registration',
      route: '/api/stripe/event-registration-webhook',
      status: 'failed',
      httpStatus: 400,
      errorMessage: e?.message ?? 'Invalid signature',
    })
    return NextResponse.json({ error: e?.message ?? 'Invalid signature' }, { status: 400 })
  }

  const session = getCheckoutSession(event)
  const logId = await createWebhookDeliveryLog({
    source: 'event_registration',
    route: '/api/stripe/event-registration-webhook',
    eventType: event.type,
    status: 'received',
    stripeEventId: event.id,
    stripeCheckoutSessionId: session?.id ?? null,
    stripePaymentIntentId:
      typeof session?.payment_intent === 'string'
        ? session.payment_intent
        : session?.payment_intent?.id ?? null,
    eventId: session?.metadata?.event_id ?? null,
    userId: session?.metadata?.user_id ?? null,
    registrationId: session?.metadata?.registration_id ?? null,
  })

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      if (session && isEventRegistrationSession(session)) {
        await persistEventRegistrationFromSession(session)
        await updateWebhookDeliveryLog(logId, {
          status: 'processed',
          httpStatus: 200,
          processedAt: new Date().toISOString(),
          note: 'Event registration payment persisted.',
        })
      } else {
        await updateWebhookDeliveryLog(logId, {
          status: 'skipped',
          httpStatus: 200,
          processedAt: new Date().toISOString(),
          note: 'Checkout session was not tagged for event registration.',
        })
      }
    } else {
      await updateWebhookDeliveryLog(logId, {
        status: 'skipped',
        httpStatus: 200,
        processedAt: new Date().toISOString(),
        note: `Event type ${event.type} does not require event registration persistence.`,
      })
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    await updateWebhookDeliveryLog(logId, {
      status: 'failed',
      httpStatus: 500,
      errorMessage: e?.message ?? 'Server error',
      processedAt: new Date().toISOString(),
    })
    console.error('POST /api/stripe/event-registration-webhook error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
