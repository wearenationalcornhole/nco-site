// app/portal/api/events/[id]/register/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type RegistrationRow = {
  id?: string
  event_id: string
  user_id: string
  division_id?: string | null
  status?: string | null
  checked_in?: boolean | null
  created_at?: string | Date | null
}

async function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function toRegistration(row: RegistrationRow | null) {
  if (!row) return null
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    divisionId: row.division_id ?? null,
    status: row.status ?? null,
    checkedIn: row.checked_in ?? null,
    createdAt: row.created_at ?? null,
  }
}

export async function GET(_req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string }
    if (!id) return NextResponse.json({ loggedIn: false, registration: null })

    const supabase = await getSupabaseServer()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ loggedIn: false, registration: null })
    }

    const service = await getSupabaseAdmin()
    if (service) {
      const { data, error } = await service
        .from('registrations')
        .select('id,event_id,user_id,division_id,status,checked_in,created_at')
        .eq('event_id', id)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error) throw error
      return NextResponse.json({ loggedIn: true, registration: toRegistration(data as RegistrationRow | null) })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const existing = (await prisma.registrations.findFirst({
        where: { event_id: id, user_id: session.user.id },
      })) as unknown as RegistrationRow | null
      return NextResponse.json({ loggedIn: true, registration: toRegistration(existing) })
    }

    const existing = devStore
      .getAll<any>('registrations')
      .find((row) => row.event_id === id && row.user_id === session.user.id)

    return NextResponse.json({ loggedIn: true, registration: toRegistration(existing ?? null) })
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/register error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string }
    if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const divisionId =
      typeof body?.divisionId === 'string' && body.divisionId.trim()
        ? body.divisionId.trim()
        : null

    const prisma = await getPrisma()

    const supabase = await getSupabaseServer()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const service = await getSupabaseAdmin()

    if (service) {
      const { data: existing, error: existingError } = await service
        .from('registrations')
        .select('id,event_id,user_id,division_id,status,checked_in,created_at')
        .eq('event_id', id)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingError) throw existingError

      if (existing) {
        const patch: Record<string, any> = {}
        if (existing.division_id !== divisionId) patch.division_id = divisionId
        if (!existing.status) patch.status = 'registered'
        if (existing.checked_in == null) patch.checked_in = false

        if (Object.keys(patch).length === 0) {
          return NextResponse.json({ updated: false, registration: toRegistration(existing as RegistrationRow) })
        }

        const { data: updated, error: updateError } = await service
          .from('registrations')
          .update(patch)
          .eq('id', existing.id)
          .select('id,event_id,user_id,division_id,status,checked_in,created_at')
          .single()

        if (updateError) throw updateError
        return NextResponse.json({ updated: true, registration: toRegistration(updated as RegistrationRow) })
      }

      const insertPayload: Record<string, any> = {
        event_id: id,
        user_id: userId,
        status: 'registered',
        checked_in: false,
      }
      if (divisionId) insertPayload.division_id = divisionId

      const { data: created, error: createError } = await service
        .from('registrations')
        .insert(insertPayload)
        .select('id,event_id,user_id,division_id,status,checked_in,created_at')
        .single()

      if (createError) throw createError
      return NextResponse.json({ updated: false, registration: toRegistration(created as RegistrationRow) }, { status: 201 })
    }

    if (prisma) {
      const exists = await prisma.registrations.findFirst({
        where: { event_id: id, user_id: userId },
      })
      if (exists) {
        return NextResponse.json({ updated: false, registration: toRegistration(exists as unknown as RegistrationRow) })
      }
      const created = await prisma.registrations.create({
        data: { event_id: id, user_id: userId },
      })
      return NextResponse.json(
        { updated: false, registration: toRegistration(created as unknown as RegistrationRow) },
        { status: 201 },
      )
    }

    // dev fallback
    const already = devStore
      .getAll('registrations')
      .find((r: any) => r.event_id === id && r.user_id === userId)
    if (already) {
      const updated = devStore.upsert('registrations', {
        ...already,
        division_id: divisionId,
        status: already.status ?? 'registered',
        checked_in: already.checked_in ?? false,
      })
      return NextResponse.json({ updated: true, registration: toRegistration(updated as RegistrationRow) })
    }

    const created = devStore.upsert('registrations', {
      event_id: id,
      user_id: userId,
      division_id: divisionId,
      status: 'registered',
      checked_in: false,
      created_at: new Date(),
    })

    return NextResponse.json({ updated: false, registration: toRegistration(created as RegistrationRow) }, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/register error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
