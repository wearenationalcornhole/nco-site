export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { getStripeClient } from '@/app/lib/stripe'
import { getStripeWebhookSecret } from '@/app/lib/eventRegistration'
import { upsertEventRegistrationPayment } from '@/app/lib/paymentPersistence'

type RegistrationRecord = {
  id?: string
  event_id: string
  user_id: string
  created_at: string
}

async function createRegistrationIfMissing(eventId: string, userId: string) {
  const prisma = await getPrisma()

  if (prisma) {
    const existing = await prisma.registrations.findFirst({
      where: { event_id: eventId, user_id: userId },
      select: { id: true },
    })
    if (existing) return existing.id

    const created = await prisma.registrations.create({
      data: {
        event_id: eventId,
        user_id: userId,
      },
    })
    return created.id
  }

  const existing = devStore
    .getAll<RegistrationRecord>('registrations')
    .find((registration) => registration.event_id === eventId && registration.user_id === userId)
  if (existing) return existing.id

  const created = devStore.upsert<RegistrationRecord>('registrations', {
    event_id: eventId,
    user_id: userId,
    created_at: new Date().toISOString(),
  })
  return created.id
}

function isEventRegistrationSession(session: Stripe.Checkout.Session) {
  return session.metadata?.mode === 'event_registration'
}

export async function POST(req: Request) {
  const stripe = getStripeClient()
  const webhookSecret = getStripeWebhookSecret()

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid signature' }, { status: 400 })
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session
      if (isEventRegistrationSession(session)) {
        const eventId = session.metadata?.event_id
        const userId = session.metadata?.user_id
        if (eventId && userId) {
          const registrationId = await createRegistrationIfMissing(eventId, userId)
          await upsertEventRegistrationPayment({
            eventId,
            userId,
            registrationId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
            amountCents: session.amount_total ?? 0,
            currency: session.currency ?? 'usd',
            status: session.payment_status ?? session.status ?? 'paid',
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('POST /api/stripe/event-registration-webhook error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
