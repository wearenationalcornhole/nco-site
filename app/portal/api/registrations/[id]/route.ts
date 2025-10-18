export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { devStore } from '@/app/lib/devStore'

async function getSupa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key)
}

// PATCH /portal/api/registrations/[id] { checked_in?, notes? }
export async function PATCH(req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, any> = {}
    if (typeof body.checked_in === 'boolean') patch.checked_in = body.checked_in
    if (typeof body.notes === 'string') patch.notes = body.notes

    const supa = await getSupa()
    if (supa) {
      const { data, error } = await supa
        .from('registrations')
        .update(patch)
        .eq('id', id)
        .select('id,event_id,user_id,status,checked_in,notes,created_at')
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    // dev fallback
    const current = devStore.getById<any>('registrations', id)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('registrations', { ...current, ...patch })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PATCH /portal/api/registrations/[id] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /portal/api/registrations/[id]
export async function DELETE(_req: Request, context: any) {
  const id = context?.params?.id as string
  try {
    const supa = await getSupa()
    if (supa) {
      const { error } = await supa.from('registrations').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const ok = devStore.remove('registrations', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    console.error('DELETE /portal/api/registrations/[id] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}