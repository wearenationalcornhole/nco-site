export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { getStripeClient } from '@/app/lib/stripe'
import { getStripeWebhookSecret } from '@/app/lib/eventRegistration'

async function createRegistrationIfMissing(eventId: string, userId: string) {
  const prisma = await getPrisma()

  if (prisma) {
    const existing = await prisma.registrations.findFirst({
      where: { event_id: eventId, user_id: userId },
      select: { id: true },
    })
    if (existing) return

    await prisma.registrations.create({
      data: {
        event_id: eventId,
        user_id: userId,
      },
    })
    return
  }

  const existing = devStore
    .getAll<any>('registrations')
    .find((registration) => registration.event_id === eventId && registration.user_id === userId)
  if (existing) return

  devStore.upsert('registrations', {
    event_id: eventId,
    user_id: userId,
    created_at: new Date().toISOString(),
  })
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
          await createRegistrationIfMissing(eventId, userId)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('POST /api/stripe/event-registration-webhook error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
