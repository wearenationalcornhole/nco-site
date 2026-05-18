import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { markBagDesignsOrdered } from '@/app/lib/bagMakerData'
import { getStripeClient } from '@/app/lib/stripe'
import { persistStoreOrderFromSession } from '@/app/lib/paymentPersistence'
import { createWebhookDeliveryLog, updateWebhookDeliveryLog } from '@/app/lib/webhookDeliveries'

export const runtime = 'nodejs'

function getCheckoutSession(event: Stripe.Event) {
  if (event.data.object.object !== 'checkout.session') return null
  return event.data.object as Stripe.Checkout.Session
}

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const payload = await request.text()

  if (!stripe || !webhookSecret) {
    await createWebhookDeliveryLog({
      source: 'store_checkout',
      route: '/api/stripe/webhook',
      status: 'config_missing',
      httpStatus: 200,
      errorMessage: 'Stripe webhook received without full secret configuration.',
    })
    console.warn('Stripe webhook received without full secret configuration. Skipping verification.')
    return NextResponse.json({ received: true, verified: false, stored: false })
  }

  if (!signature) {
    await createWebhookDeliveryLog({
      source: 'store_checkout',
      route: '/api/stripe/webhook',
      status: 'failed',
      httpStatus: 400,
      errorMessage: 'Missing Stripe signature header.',
    })
    return NextResponse.json({ error: 'Missing Stripe signature header.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify Stripe webhook signature.'
    await createWebhookDeliveryLog({
      source: 'store_checkout',
      route: '/api/stripe/webhook',
      status: 'failed',
      httpStatus: 400,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const session = getCheckoutSession(event)
  const logId = await createWebhookDeliveryLog({
    source: 'store_checkout',
    route: '/api/stripe/webhook',
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

  if (event.type === 'checkout.session.completed') {
    try {
      const stored = session ? await persistStoreOrderFromSession(stripe, session) : false
      const customDesignIds = session?.metadata?.custom_design_ids
        ?.split(',')
        .map((value) => value.trim())
        .filter(Boolean) ?? []

      if (session && customDesignIds.length > 0) {
        await markBagDesignsOrdered(customDesignIds, session.id)
      }

      await updateWebhookDeliveryLog(logId, {
        status: stored ? 'processed' : 'skipped',
        httpStatus: 200,
        processedAt: new Date().toISOString(),
        note: stored ? 'Store order persistence completed.' : 'Checkout session did not match store order persistence rules.',
      })
      console.log('Stripe checkout completed', {
        sessionId: session?.id,
        amountTotal: session?.amount_total,
        currency: session?.currency,
        metadata: session?.metadata,
        stored,
      })
      return NextResponse.json({ received: true, verified: true, stored })
    } catch (error: any) {
      await updateWebhookDeliveryLog(logId, {
        status: 'failed',
        httpStatus: 500,
        errorMessage: error?.message ?? 'Store webhook processing failed.',
        processedAt: new Date().toISOString(),
      })
      return NextResponse.json({ error: error?.message ?? 'Store webhook processing failed.' }, { status: 500 })
    }
  }

  await updateWebhookDeliveryLog(logId, {
    status: 'skipped',
    httpStatus: 200,
    processedAt: new Date().toISOString(),
    note: `Event type ${event.type} does not require store order persistence.`,
  })
  return NextResponse.json({ received: true, verified: true, stored: false })
}
