import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'

type AllowedRole = 'admin' | 'organizer' | 'player'

export type RouteActor = {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>
  user: { id: string; email?: string | null }
  role: string | null
}

export async function getRouteActor() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, role: null as string | null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>()

  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    role: profile?.role ?? null,
  }
}

export async function requireRouteRoles(roles: AllowedRole[]) {
  const actor = await getRouteActor()

  if (!actor.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!roles.includes((actor.role ?? '') as AllowedRole)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { actor }
}

export async function listManagedEventIds(actor: RouteActor) {
  if (actor.role === 'admin') return null
  if (actor.role !== 'organizer') return []

  const { data, error } = await actor.supabase
    .from('event_admins')
    .select('event_id')
    .eq('user_id', actor.user.id)

  if (error) return []
  const rows = (data ?? []) as Array<{ event_id: string }>
  return rows.map((row) => row.event_id).filter(Boolean)
}

export async function canManageEvent(actor: RouteActor, eventId: string) {
  if (actor.role === 'admin') return true
  if (actor.role !== 'organizer') return false

  const { data, error } = await actor.supabase
    .from('event_admins')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', actor.user.id)
    .maybeSingle()

  return !error && Boolean(data)
}

export function splitDisplayName(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return { firstName: null, lastName: null }
  }

  const parts = trimmed.split(/\s+/)
  const firstName = parts.shift() ?? null
  const lastName = parts.join(' ').trim() || null
  return { firstName, lastName }
}
