export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { retryWebhookDeliveryLogById } from '@/app/lib/webhookDeliveries'

async function requireAdmin() {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, role: profile.role }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = (await req.json().catch(() => ({}))) as { id?: string }
  const id = String(body.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Webhook log id is required.' }, { status: 400 })
  }

  try {
    const result = await retryWebhookDeliveryLogById(id, {
      userId: auth.user.id,
      role: auth.role,
    })
    return NextResponse.json({ ok: true, log: result })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Retry failed.' }, { status: 400 })
  }
}
