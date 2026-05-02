import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getStripeClient } from '@/app/lib/stripe'
import { persistStoreOrderFromSession } from '@/app/lib/paymentPersistence'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const payload = await request.text()

  if (!stripe || !signature || !webhookSecret) {
    console.warn('Stripe webhook received without full secret configuration. Skipping verification.')
    return NextResponse.json({ received: true, verified: false, stored: false })
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const stored = await persistStoreOrderFromSession(stripe, session)
      console.log('Stripe checkout completed', {
        sessionId: session.id,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
        stored,
      })
      return NextResponse.json({ received: true, verified: true, stored })
    }

    return NextResponse.json({ received: true, verified: true, stored: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify Stripe webhook signature.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
