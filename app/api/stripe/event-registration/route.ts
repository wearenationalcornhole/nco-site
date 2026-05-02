export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { getStripeClient } from '@/app/lib/stripe'
import { getEventRegistrationConfig } from '@/app/lib/eventRegistration'
import { upsertEventRegistrationPayment } from '@/app/lib/paymentPersistence'

type Body = {
  eventId?: string
  redirectTo?: string
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function sanitizeRedirectTo(value?: string) {
  if (!value || !value.startsWith('/')) return '/portal/events'
  return value
}

async function getEventRecord(eventId: string) {
  const prisma = await getPrisma()

  if (prisma) {
    const event = isUuidLike(eventId)
      ? await prisma.events.findFirst({
          where: { OR: [{ id: eventId }, { slug: eventId }] },
          select: { id: true, slug: true, title: true },
        })
      : await prisma.events.findFirst({
          where: { slug: eventId },
          select: { id: true, slug: true, title: true },
        })

    return event ? { event, prisma } : { event: null, prisma }
  }

  const event = devStore
    .getAll<any>('events')
    .find((item) => item.id === eventId || item.slug === eventId)

  return {
    prisma: null,
    event: event
      ? { id: String(event.id), slug: event.slug ?? null, title: String(event.title ?? '') }
      : null,
  }
}

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const eventId = String(body.eventId ?? '').trim()
    const redirectTo = sanitizeRedirectTo(body.redirectTo)

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
    }

    const supabase = await getSupabaseServer()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { event, prisma } = await getEventRecord(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const registrationConfig = getEventRegistrationConfig(event)
    if (registrationConfig.mode !== 'paid' || !registrationConfig.amountUsd) {
      return NextResponse.json({ error: 'This event does not require paid checkout' }, { status: 400 })
    }

    const userId = session.user.id
    const userEmail = session.user.email ?? undefined

    if (prisma) {
      const existing = await prisma.registrations.findFirst({
        where: { event_id: event.id, user_id: userId },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json({ error: 'Already registered' }, { status: 409 })
      }
    } else {
      const existing = devStore
        .getAll<any>('registrations')
        .find((registration) => registration.event_id === event.id && registration.user_id === userId)
      if (existing) {
        return NextResponse.json({ error: 'Already registered' }, { status: 409 })
      }
    }

    const origin = new URL(req.url).origin
    const sessionRecord = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: userEmail,
      success_url: `${origin}${redirectTo}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${redirectTo}?checkout=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: registrationConfig.currency,
            unit_amount: Math.round(registrationConfig.amountUsd * 100),
            product_data: {
              name: `${event.title} Registration`,
              description: registrationConfig.description,
            },
          },
        },
      ],
      client_reference_id: `${event.id}:${userId}`,
      metadata: {
        mode: 'event_registration',
        event_id: event.id,
        event_slug: event.slug ?? '',
        redirect_to: redirectTo,
        user_id: userId,
        user_email: userEmail ?? '',
      },
    })

    await upsertEventRegistrationPayment({
      eventId: event.id,
      userId,
      stripeCheckoutSessionId: sessionRecord.id,
      stripePaymentIntentId:
        typeof sessionRecord.payment_intent === 'string'
          ? sessionRecord.payment_intent
          : sessionRecord.payment_intent?.id ?? null,
      amountCents: Math.round(registrationConfig.amountUsd * 100),
      currency: registrationConfig.currency,
      status: sessionRecord.payment_status ?? sessionRecord.status ?? 'pending',
    })

    return NextResponse.json({ url: sessionRecord.url }, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/stripe/event-registration error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
