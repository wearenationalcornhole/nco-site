export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import {
  listEventRegistrationPaymentsByUserId,
  listStoreOrdersByEmail,
} from '@/app/lib/paymentPersistence'

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [storeOrders, eventPayments] = await Promise.all([
      listStoreOrdersByEmail(user.email ?? '', 20),
      listEventRegistrationPaymentsByUserId(user.id, 20),
    ])

    return NextResponse.json({
      storeOrders,
      eventPayments,
    })
  } catch (error: any) {
    console.error('GET /portal/api/orders error:', error)
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 })
  }
}
