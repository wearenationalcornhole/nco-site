export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getStripeClient } from '@/app/lib/stripe'
import {
  getEventRegistrationPaymentById,
  getStoreOrderById,
  isRefundedLikeStatus,
  removeRegistrationRecord,
  updateEventRegistrationPayment,
  updateStoreOrder,
} from '@/app/lib/paymentPersistence'

type Body = {
  kind?: 'store_order' | 'event_registration'
  id?: string
  action?: 'refund' | 'cancel'
  removeRegistration?: boolean
}

async function getActor() {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, role: null as string | null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>()

  return { supabase, user, role: profile?.role ?? null }
}

async function canManageEventPayment(eventId: string, actorId: string, role: string | null) {
  if (role === 'admin') return true
  if (role !== 'organizer') return false

  const supabase = createRouteHandlerClient({ cookies })
  const { data: organizerLink } = await supabase
    .from('event_admins')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', actorId)
    .maybeSingle()

  return Boolean(organizerLink)
}

export async function POST(req: Request) {
  try {
    const { user, role } = await getActor()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const kind = body.kind
    const id = String(body.id ?? '').trim()
    const action = body.action
    const removeRegistration = body.removeRegistration !== false

    if (!kind || !id || !action) {
      return NextResponse.json({ error: 'Missing kind, id, or action' }, { status: 400 })
    }

    const stripe = getStripeClient()

    if (kind === 'store_order') {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (action !== 'refund') {
        return NextResponse.json({ error: 'Unsupported action for store orders' }, { status: 400 })
      }

      const order = await getStoreOrderById(id)
      if (!order) {
        return NextResponse.json({ error: 'Store order not found' }, { status: 404 })
      }
      if (isRefundedLikeStatus(order.status)) {
        return NextResponse.json({ ok: true, order, alreadyRefunded: true })
      }
      if (!order.stripePaymentId) {
        return NextResponse.json({ error: 'No Stripe payment intent found for this order' }, { status: 400 })
      }
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
      }

      await stripe.refunds.create({
        payment_intent: order.stripePaymentId,
        metadata: {
          source: 'nco-store-order-refund',
          order_id: order.id,
          actor_user_id: user.id,
        },
      })

      const updated = await updateStoreOrder(order.id, { status: 'refunded' })
      return NextResponse.json({ ok: true, order: updated })
    }

    const payment = await getEventRegistrationPaymentById(id)
    if (!payment) {
      return NextResponse.json({ error: 'Event payment not found' }, { status: 404 })
    }

    const canManage = await canManageEventPayment(payment.eventId, user.id, role)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'refund') {
      if (isRefundedLikeStatus(payment.status)) {
        return NextResponse.json({ ok: true, payment, alreadyRefunded: true })
      }
      if (!payment.stripePaymentIntentId) {
        return NextResponse.json({ error: 'No Stripe payment intent found for this registration' }, { status: 400 })
      }
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
      }

      await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        metadata: {
          source: 'nco-event-registration-refund',
          event_id: payment.eventId,
          payment_id: payment.id,
          actor_user_id: user.id,
        },
      })

      let registrationRemoved = false
      if (removeRegistration && payment.registrationId) {
        registrationRemoved = await removeRegistrationRecord(payment.registrationId)
      }

      const updated = await updateEventRegistrationPayment(payment.id, {
        status: 'refunded',
        ...(registrationRemoved ? { registrationId: null } : {}),
      })

      return NextResponse.json({ ok: true, payment: updated, registrationRemoved })
    }

    let registrationRemoved = false
    if (removeRegistration && payment.registrationId) {
      registrationRemoved = await removeRegistrationRecord(payment.registrationId)
    }

    const updated = await updateEventRegistrationPayment(payment.id, {
      status: 'cancelled',
      ...(registrationRemoved ? { registrationId: null } : {}),
    })

    return NextResponse.json({ ok: true, payment: updated, registrationRemoved })
  } catch (error: any) {
    console.error('POST /portal/api/payments/actions error:', error)
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 })
  }
}
