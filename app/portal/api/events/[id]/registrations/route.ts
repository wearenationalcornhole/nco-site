// app/portal/api/events/[id]/registrations/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

type UserDb = {
  id: string
  email: string
  name?: string | null
}

type RowDb = {
  id?: string
  event_id: string
  user_id: string
  division_id?: string | null
  status?: string | null
  checked_in?: boolean | null
  notes?: string | null
  created_at: string | Date | null
}

type Row = {
  id: string
  eventId: string
  userId: string
  divisionId: string | null
  status: string | null
  checkedIn: boolean | null
  notes: string | null
  createdAt: string | null
  user?: { id: string; email?: string | null; name?: string | null } | null
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function asIso(d: string | Date | null): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

function toApiRow(r: RowDb, user?: UserDb | null): Row {
  return {
    id: r.id!, // set by prisma or devStore
    eventId: r.event_id,
    userId: r.user_id,
    divisionId: r.division_id ?? null,
    status: r.status ?? null,
    checkedIn: r.checked_in ?? null,
    notes: r.notes ?? null,
    createdAt: asIso(r.created_at),
    user: user ? { id: user.id, email: user.email, name: user.name ?? null } : null,
  }
}

/* ─────────────────────────────────────────────────────────────
   GET /portal/api/events/:id/registrations
   ───────────────────────────────────────────────────────────── */

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const supabase = await getSupabaseAdmin()
    if (supabase) {
      const { data: regs, error: regError } = await supabase
        .from('registrations')
        .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
        .eq('event_id', id)
        .order('created_at', { ascending: false })

      if (regError) throw regError

      const userIds = Array.from(new Set((regs ?? []).map((row) => row.user_id)))
      const { data: profiles } =
        userIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id,email,first_name,last_name')
              .in('id', userIds)
          : { data: [] }

      const userMap = new Map(
        (profiles ?? []).map((profile: any) => [
          profile.id,
          {
            id: profile.id,
            email: profile.email ?? null,
            name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
          },
        ]),
      )

      return NextResponse.json(
        (regs ?? []).map((row: any) => toApiRow(row as RowDb, userMap.get(row.user_id))),
      )
    }

    const prisma = await getPrisma()

    if (prisma) {
      const regs = (await prisma.registrations.findMany({
        where: { event_id: id },
        orderBy: { created_at: 'desc' },
      })) as unknown as RowDb[]

      // fetch users for mapping (1 query)
      const userIds = Array.from(new Set(regs.map((r) => r.user_id)))
      const users =
        userIds.length > 0
          ? ((await prisma.users.findMany({
              where: { id: { in: userIds } },
              select: { id: true, email: true, name: true },
            })) as unknown as UserDb[])
          : []
      const userMap = new Map(users.map((u) => [u.id, u]))

      return NextResponse.json(regs.map((r) => toApiRow(r, userMap.get(r.user_id))))
    }

    // devStore fallback
    const regs = devStore
      .getAll<RowDb>('registrations')
      .filter((r) => r.event_id === id)
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))

    // build user map from devStore
    const userIds = Array.from(new Set(regs.map((r) => r.user_id)))
    const users = devStore.getAll<UserDb>('users').filter((u) => userIds.includes(u.id))
    const userMap = new Map(users.map((u) => [u.id, u]))

    return NextResponse.json(regs.map((r) => toApiRow(r, userMap.get(r.user_id))))
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────────────────────
   POST /portal/api/events/:id/registrations
   Body: { email: string, name?: string }
   - find or create user by email
   - ensure not already registered for event
   - create registration
   ───────────────────────────────────────────────────────────── */

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const body = await req.json().catch(() => ({}))

    const email = String(body?.email ?? '').trim().toLowerCase()
    const name = body?.name ? String(body.name).trim() : undefined
    const divisionId =
      typeof body?.divisionId === 'string' && body.divisionId.trim()
        ? body.divisionId.trim()
        : null

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const supabase = await getSupabaseAdmin()
    if (supabase) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,email,first_name,last_name')
        .eq('email', email)
        .maybeSingle()

      if (profileError) throw profileError
      if (!profile?.id) {
        return NextResponse.json(
          {
            error:
              'Player needs a portal account before an organizer can register them by email.',
          },
          { status: 404 },
        )
      }

      const { data: existing } = await supabase
        .from('registrations')
        .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
        .eq('event_id', id)
        .eq('user_id', profile.id)
        .maybeSingle()

      if (existing) {
        const patch: Record<string, any> = {}
        if (existing.division_id !== divisionId) patch.division_id = divisionId
        if (!existing.status) patch.status = 'registered'
        if (existing.checked_in == null) patch.checked_in = false

        if (Object.keys(patch).length > 0) {
          const { data: updated, error: updateError } = await supabase
            .from('registrations')
            .update(patch)
            .eq('id', existing.id)
            .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
            .single()
          if (updateError) throw updateError
          return NextResponse.json(
            toApiRow(updated as RowDb, {
              id: profile.id,
              email: profile.email ?? null,
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || name || null,
            }),
          )
        }

        return NextResponse.json(
          toApiRow(existing as RowDb, {
            id: profile.id,
            email: profile.email ?? null,
            name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || name || null,
          }),
        )
      }

      const payload: Record<string, any> = {
        event_id: id,
        user_id: profile.id,
        status: 'registered',
        checked_in: false,
      }
      if (divisionId) payload.division_id = divisionId

      const { data: created, error: createError } = await supabase
        .from('registrations')
        .insert(payload)
        .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
        .single()

      if (createError) throw createError

      return NextResponse.json(
        toApiRow(created as RowDb, {
          id: profile.id,
          email: profile.email ?? null,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || name || null,
        }),
        { status: 201 },
      )
    }

    const prisma = await getPrisma()

    if (prisma) {
      // find or create user
      let user = (await prisma.users.findFirst({
        where: { email },
        select: { id: true, email: true, name: true },
      })) as unknown as UserDb | null

      if (!user) {
        user = (await prisma.users.create({
          data: {
            email,
            ...(name ? { name } : {}),
          },
          select: { id: true, email: true, name: true },
        })) as unknown as UserDb
      } else if (name && !user.name) {
        // optional: backfill name if empty
        await prisma.users.update({
          where: { id: user.id },
          data: { name },
        })
        user = { ...user, name }
      }

      // prevent duplicate registration
      const existing = await prisma.registrations.findFirst({
        where: { event_id: id, user_id: user.id },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Player already registered for this event' },
          { status: 409 }
        )
      }

      // create registration
      const created = (await prisma.registrations.create({
        data: {
          event_id: id,
          user_id: user.id,
        },
      })) as unknown as RowDb

      return NextResponse.json(toApiRow(created, user), { status: 201 })
    }

    // devStore fallback
    // find or create user
    let user = devStore.getAll<UserDb>('users').find((u) => u.email.toLowerCase() === email) || null
    if (!user) {
      user = devStore.upsert<UserDb>('users', {
        email,
        name: name ?? null,
      } as any) // id will be generated by devStore
    } else if (name && !user.name) {
      user = devStore.upsert<UserDb>('users', { ...user, name })
    }

    // prevent duplicate registration
    const existing = devStore
      .getAll<RowDb>('registrations')
      .find((r) => r.event_id === id && r.user_id === user.id)
    if (existing) {
      return NextResponse.json(
        { error: 'Player already registered for this event' },
        { status: 409 }
      )
    }

    // create registration
    const created = devStore.upsert<RowDb>('registrations', {
      event_id: id,
      user_id: user.id,
      created_at: new Date(),
    })

    return NextResponse.json(toApiRow(created, user), { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const url = new URL(req.url)
    const registrationId = url.searchParams.get('registrationId')
    const userId = url.searchParams.get('userId')

    if (!registrationId && !userId) {
      return NextResponse.json({ error: 'registrationId or userId required' }, { status: 400 })
    }

    const supabase = await getSupabaseAdmin()
    if (supabase) {
      let query = supabase.from('registrations').delete().eq('event_id', id)
      query = registrationId ? query.eq('id', registrationId) : query.eq('user_id', userId!)
      const { error } = await query
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    const prisma = await getPrisma()
    if (prisma) {
      if (registrationId) {
        const result = await prisma.registrations.deleteMany({
          where: { id: registrationId, event_id: id },
        })
        if (result.count === 0) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
      } else {
        await prisma.registrations.deleteMany({
          where: { event_id: id, user_id: userId! },
        })
      }
      return NextResponse.json({ ok: true })
    }

    if (registrationId) {
      const row = devStore.getById<any>('registrations', registrationId)
      if (!row || row.event_id !== id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      devStore.remove('registrations', registrationId)
    } else {
      const rows = devStore.getAll<any>('registrations')
      const row = rows.find((item) => item.event_id === id && item.user_id === userId)
      if (!row?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      devStore.remove('registrations', row.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
