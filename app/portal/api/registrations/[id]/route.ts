export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'
import { getSupabaseServiceRoleKey } from '@/app/lib/site'
import { canManageEvent, getRouteActor } from '@/app/lib/portalRouteAccess'

type RegistrationRow = {
  id: string
  event_id: string
  user_id: string
  status?: string | null
  checked_in?: boolean | null
  notes?: string | null
  created_at?: string | null
}

async function getSupa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key)
}

async function getAuthorizedRegistration(id: string) {
  const actor = await getRouteActor()
  if (!actor.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supa = await getSupa()
  if (!supa) {
    const registration = devStore.getById<RegistrationRow>('registrations', id)
    if (!registration) {
      return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
    }

    const canEdit =
      registration.user_id === actor.user.id ||
      (registration.event_id ? await canManageEvent(actor, registration.event_id) : false)

    if (!canEdit) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return { actor, registration, supa: null }
  }

  const { data: registration, error: registrationError } = await supa
    .from('registrations')
    .select('id,event_id,user_id,status,checked_in,notes,created_at')
    .eq('id', id)
    .maybeSingle<RegistrationRow>()

  if (registrationError) {
    return { error: NextResponse.json({ error: registrationError.message }, { status: 500 }) }
  }

  if (!registration) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  const canEdit =
    registration.user_id === actor.user.id ||
    (registration.event_id ? await canManageEvent(actor, registration.event_id) : false)

  if (!canEdit) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { actor, registration, supa }
}

export async function PATCH(req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const access = await getAuthorizedRegistration(id)
    if ('error' in access) return access.error

    const body = await req.json().catch(() => ({}))
    const patch: Record<string, any> = {}
    if (typeof body.checked_in === 'boolean') patch.checked_in = body.checked_in
    if (typeof body.notes === 'string') patch.notes = body.notes

    if (access.supa) {
      const { data, error } = await access.supa
        .from('registrations')
        .update(patch)
        .eq('id', id)
        .eq('user_id', access.registration.user_id)
        .select('id,event_id,user_id,status,checked_in,notes,created_at')
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    const updated = devStore.upsert('registrations', { ...access.registration, ...patch })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PATCH /portal/api/registrations/[id] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const access = await getAuthorizedRegistration(id)
    if ('error' in access) return access.error

    if (access.supa) {
      const { error } = await access.supa
        .from('registrations')
        .delete()
        .eq('id', id)
        .eq('user_id', access.registration.user_id)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    const ok = devStore.remove('registrations', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    console.error('DELETE /portal/api/registrations/[id] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
