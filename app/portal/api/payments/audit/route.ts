export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { listPaymentAuditActionsForEvent, listRecentPaymentAuditActions } from '@/app/lib/paymentPersistence'

async function canManageEvent(eventId: string, userId: string, role: string | null) {
  if (role === 'admin') return true
  if (role !== 'organizer') return false

  const supabase = createRouteHandlerClient({ cookies })
  const { data: organizerLink } = await supabase
    .from('event_admins')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  return Boolean(organizerLink)
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<{ role: string | null }>()

    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') ?? '10')))

    if (eventId) {
      const allowed = await canManageEvent(eventId, user.id, profile?.role ?? null)
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const actions = await listPaymentAuditActionsForEvent(eventId, limit)
      return NextResponse.json(actions)
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const actions = await listRecentPaymentAuditActions(limit)
    return NextResponse.json(actions)
  } catch (error: any) {
    console.error('GET /portal/api/payments/audit error:', error)
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 })
  }
}
