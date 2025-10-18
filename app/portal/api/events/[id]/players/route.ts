export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'

// Lazy import supabase admin when available
async function getSupa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key)
}

// Compose “player rows” for UI
type PlayerRow = {
  id: string               // registration id
  event_id: string
  user_id: string
  email: string
  name?: string | null
  status?: string | null
  checked_in?: boolean | null
  notes?: string | null
  created_at?: string | null
}

// GET /portal/api/events/[id]/players
export async function GET(_req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const supa = await getSupa()
    if (supa) {
      // Load registrations for the event
      const { data: regs, error: rErr } = await supa
        .from('registrations')
        .select('id,event_id,user_id,status,checked_in,notes,created_at')
        .eq('event_id', id)
        .order('created_at', { ascending: false })
      if (rErr) throw rErr

      const userIds = Array.from(new Set((regs ?? []).map(r => r.user_id)))
      let usersById: Record<string, { id: string; email: string; name?: string | null }> = {}
      if (userIds.length) {
        const { data: users, error: uErr } = await supa
          .from('users')
          .select('id,email,name')
          .in('id', userIds)
        if (uErr) throw uErr
        usersById = Object.fromEntries((users ?? []).map(u => [u.id, u]))
      }

      const items: PlayerRow[] = (regs ?? []).map(r => {
        const u = usersById[r.user_id]
        return {
          id: r.id, event_id: r.event_id, user_id: r.user_id,
          email: u?.email ?? '(unknown)', name: u?.name ?? null,
          status: r.status ?? null, checked_in: r.checked_in ?? null,
          notes: r.notes ?? null, created_at: r.created_at ?? null,
        }
      })
      return NextResponse.json({ source: 'supabase', items })
    }

    // Dev fallback (no Supabase)
    const regs = devStore.getAll<any>('registrations').filter(r => r.event_id === id)
    const users = devStore.getAll<any>('users')
    const usersById = Object.fromEntries(users.map(u => [u.id, u]))
    const items: PlayerRow[] = regs.map((r) => {
      const u = usersById[r.user_id] ?? {}
      return {
        id: r.id, event_id: r.event_id, user_id: r.user_id,
        email: u.email ?? '(unknown)', name: u.name ?? null,
        status: r.status ?? null, checked_in: r.checked_in ?? null,
        notes: r.notes ?? null, created_at: r.created_at ?? null,
      }
    })
    return NextResponse.json({ source: 'devStore', items })
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/players error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /portal/api/events/[id]/players { email, name? }
export async function POST(req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const payload = await req.json().catch(() => ({}))
    const email = String(payload?.email ?? '').trim().toLowerCase()
    const name = typeof payload?.name === 'string' ? payload.name.trim() : undefined
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const supa = await getSupa()
    if (supa) {
      // Upsert user by email
      const { data: existingUser } = await supa
        .from('users')
        .select('id,email,name')
        .eq('email', email)
        .maybeSingle()

      let userId = existingUser?.id
      if (!userId) {
        const { data: created, error: cErr } = await supa
          .from('users')
          .insert({ email, name: name || null })
          .select('id,email,name')
          .single()
        if (cErr) throw cErr
        userId = created.id
      } else if (name && !existingUser?.name) {
        // fill missing name
        await supa.from('users').update({ name }).eq('id', userId)
      }

      // Upsert registration (unique event_id+user_id recommended)
      const { data: reg, error: rErr } = await supa
        .from('registrations')
        .upsert(
          { event_id: id, user_id: userId, status: 'CONFIRMED' },
          { onConflict: 'event_id,user_id', ignoreDuplicates: false }
        )
        .select('id,event_id,user_id,status,checked_in,notes,created_at')
        .single()
      if (rErr) throw rErr

      return NextResponse.json({
        id: reg.id,
        event_id: reg.event_id,
        user_id: reg.user_id,
        email,
        name: name ?? existingUser?.name ?? null,
        status: reg.status ?? null,
        checked_in: reg.checked_in ?? null,
        notes: reg.notes ?? null,
        created_at: reg.created_at ?? null,
      }, { status: 201 })
    }

    // Dev fallback
    // find/create user
    let user = devStore.getAll<any>('users').find(u => (u.email ?? '').toLowerCase() === email)
    if (!user) user = devStore.upsert('users', { email, name: name ?? null })
    if (name && !user.name) { user = devStore.upsert('users', { ...user, name }) }

    // upsert registration
    let reg = devStore.getAll<any>('registrations').find(r => r.event_id === id && r.user_id === user.id)
    if (!reg) reg = devStore.upsert('registrations', {
      event_id: id, user_id: user.id, status: 'CONFIRMED', checked_in: false
    })
    return NextResponse.json({
      id: reg.id, event_id: id, user_id: user.id, email, name: user.name ?? null,
      status: reg.status ?? null, checked_in: reg.checked_in ?? null, notes: reg.notes ?? null, created_at: reg.created_at ?? null
    }, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/players error:', e?.message ?? e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}