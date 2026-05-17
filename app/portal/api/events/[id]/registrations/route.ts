export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { getEventRegistrationPaymentsModel } from '@/app/lib/prismaModels'
import { requireManagedEventAccess } from '@/app/lib/portalRouteAccess'
import {
  buildProfileIdentityPayload,
  getProfileServiceClient,
  listLegacyUsersByIds,
  listProfilesByIds,
  type LegacyUserIdentityRow,
  type ProfileIdentityRow,
} from '@/app/lib/profileIdentity'

type RegistrationDb = {
  id?: string
  event_id: string
  user_id: string
  division_id?: string | null
  status?: string | null
  checked_in?: boolean | null
  notes?: string | null
  created_at: string | Date | null
}

type PaymentDb = {
  id?: string
  event_id: string
  user_id: string
  registration_id?: string | null
  amount_cents?: number | null
  currency?: string | null
  status?: string | null
  created_at?: string | Date | null
}

function asIso(value: string | Date | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function keyForRegistration(registrationId: string | null | undefined, userId: string) {
  return registrationId ? `registration:${registrationId}` : `user:${userId}`
}

function buildPaymentMap(payments: PaymentDb[]) {
  const map = new Map<string, PaymentDb>()

  for (const payment of payments) {
    const paymentKey = keyForRegistration(payment.registration_id, payment.user_id)
    if (!map.has(paymentKey)) {
      map.set(paymentKey, payment)
    }

    const userKey = `user:${payment.user_id}`
    if (!map.has(userKey)) {
      map.set(userKey, payment)
    }
  }

  return map
}

function buildFallbackIdentity(userId: string, legacyUser: LegacyUserIdentityRow | null) {
  const name = legacyUser?.name?.trim() || legacyUser?.email?.split('@')[0] || 'NCO Player'
  return {
    id: userId,
    profile_id: userId,
    player_id: userId,
    email: legacyUser?.email ?? null,
    role: null,
    first_name: null,
    last_name: null,
    display_name: legacyUser?.name ?? null,
    name,
    avatar_url: null,
    city: null,
    region: null,
    club: null,
    primary_club_id: null,
    skill_level: null,
    favorite_bag_style: null,
    dominant_hand: null,
    home_venue: null,
    profile_visibility: 'members' as const,
    created_at: null,
    createdAt: null,
  }
}

function buildRegistrationRow(
  registration: RegistrationDb,
  identity:
    | ReturnType<typeof buildProfileIdentityPayload>
    | ReturnType<typeof buildFallbackIdentity>,
  payment?: PaymentDb | null,
) {
  return {
    id: registration.id!,
    registration_id: registration.id!,
    eventId: registration.event_id,
    event_id: registration.event_id,
    userId: registration.user_id,
    user_id: registration.user_id,
    profileId: identity.id,
    profile_id: identity.id,
    playerId: identity.id,
    player_id: identity.id,
    divisionId: registration.division_id ?? null,
    division_id: registration.division_id ?? null,
    createdAt: asIso(registration.created_at),
    created_at: asIso(registration.created_at),
    status: registration.status ?? null,
    checked_in: registration.checked_in ?? null,
    notes: registration.notes ?? null,
    paymentStatus: payment?.status ?? null,
    paymentAmountCents: payment?.amount_cents ?? null,
    paymentCurrency: payment?.currency ?? null,
    name: identity.name,
    email: identity.email,
    avatar_url: identity.avatar_url,
    user: {
      id: identity.id,
      email: identity.email,
      name: identity.name,
      avatar_url: identity.avatar_url,
    },
    player: identity,
  }
}

async function loadRegistrationsForEvent(eventId: string) {
  const supa = getProfileServiceClient()
  if (supa) {
    const { data, error } = await supa
      .from('registrations')
      .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { rows: (data ?? []) as RegistrationDb[], source: 'supabase' as const }
  }

  const prisma = await getPrisma()
  if (prisma) {
    const rows = (await prisma.registrations.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: 'desc' },
    })) as unknown as RegistrationDb[]
    return { rows, source: 'prisma' as const }
  }

  const rows = devStore
    .getAll<RegistrationDb>('registrations')
    .filter((registration) => registration.event_id === eventId)
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
  return { rows, source: 'devStore' as const }
}

async function loadPaymentsForEvent(eventId: string) {
  const prisma = await getPrisma()
  if (prisma) {
    const EventRegistrationPayments = getEventRegistrationPaymentsModel(prisma)
    const rows =
      EventRegistrationPayments
        ? ((await EventRegistrationPayments.findMany({
            where: { event_id: eventId },
            orderBy: { created_at: 'desc' },
          }).catch(() => [])) as PaymentDb[])
        : []
    return rows
  }

  return devStore
    .getAll<PaymentDb>('event_registration_payments')
    .filter((payment) => payment.event_id === eventId)
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
}

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const access = await requireManagedEventAccess(id)
    if ('error' in access) return access.error

    const { rows, source } = await loadRegistrationsForEvent(id)
    const payments = await loadPaymentsForEvent(id)
    const paymentMap = buildPaymentMap(payments)

    const supa = getProfileServiceClient()
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)))
    const { profilesById, clubsById } = await listProfilesByIds(supa, userIds)
    const missingUserIds = userIds.filter((userId) => !profilesById.has(userId))
    const legacyUsersById = await listLegacyUsersByIds(supa, missingUserIds)

    const items = rows.map((row) => {
      const profile = profilesById.get(row.user_id)
      const identity = profile
        ? buildProfileIdentityPayload(
            profile,
            profile.primary_club_id ? clubsById.get(profile.primary_club_id)?.name ?? null : null,
          )
        : buildFallbackIdentity(row.user_id, legacyUsersById.get(row.user_id) ?? null)

      return buildRegistrationRow(
        row,
        identity,
        paymentMap.get(keyForRegistration(row.id, row.user_id)) ?? null,
      )
    })

    return NextResponse.json(items, {
      headers: { 'x-nco-identity-source': source === 'supabase' ? 'profiles' : `${source}+profiles` },
    })
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const access = await requireManagedEventAccess(id)
    if ('error' in access) return access.error

    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const name = body?.name ? String(body.name).trim() : undefined
    const divisionId = body?.divisionId ? String(body.divisionId).trim() : null

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const supa = getProfileServiceClient()
    if (!supa) {
      let user = devStore.getAll<any>('users').find((entry) => (entry.email ?? '').toLowerCase() === email) || null
      if (!user) {
        user = devStore.upsert('users', { email, name: name ?? null })
      } else if (name && !user.name) {
        user = devStore.upsert('users', { ...user, name })
      }

      const existing = devStore
        .getAll<RegistrationDb>('registrations')
        .find((registration) => registration.event_id === id && registration.user_id === user.id)
      if (existing) {
        return NextResponse.json({ error: 'Player already registered for this event' }, { status: 409 })
      }

      const created = devStore.upsert<RegistrationDb>('registrations', {
        event_id: id,
        user_id: user.id,
        division_id: divisionId,
        status: 'CONFIRMED',
        checked_in: false,
        created_at: new Date(),
      })

      return NextResponse.json(
        buildRegistrationRow(created, buildFallbackIdentity(user.id, user), null),
        { status: 201 },
      )
    }

    const { data: profile, error: profileError } = await supa
      .from('profiles')
      .select(
        'id,email,role,created_at,first_name,last_name,display_name,avatar_url,city,region,primary_club_id,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility',
      )
      .eq('email', email)
      .maybeSingle<ProfileIdentityRow>()

    if (profileError) throw profileError
    if (!profile) {
      return NextResponse.json(
        { error: 'No portal profile exists for that email yet.' },
        { status: 404 },
      )
    }

    const { data: existing, error: existingError } = await supa
      .from('registrations')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', profile.id)
      .maybeSingle<{ id: string }>()

    if (existingError) throw existingError
    if (existing) {
      return NextResponse.json(
        { error: 'Player already registered for this event' },
        { status: 409 },
      )
    }

    if (name && !profile.display_name && !profile.first_name && !profile.last_name) {
      const parts = name.split(/\s+/).filter(Boolean)
      const firstName = parts.shift() ?? null
      const lastName = parts.join(' ').trim() || null
      await supa
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          display_name: name,
        })
        .eq('id', profile.id)
    }

    const { data: created, error: createError } = await supa
      .from('registrations')
      .insert({
        event_id: id,
        user_id: profile.id,
        division_id: divisionId,
        status: 'CONFIRMED',
        checked_in: false,
      })
      .select('id,event_id,user_id,division_id,status,checked_in,notes,created_at')
      .single<RegistrationDb>()

    if (createError) throw createError

    let clubName: string | null = null
    if (profile.primary_club_id) {
      const { data: club } = await supa
        .from('clubs')
        .select('id,name')
        .eq('id', profile.primary_club_id)
        .maybeSingle()
      clubName = club?.name ?? null
    }

    const identity = buildProfileIdentityPayload(profile, clubName)
    return NextResponse.json(buildRegistrationRow(created, identity, null), { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const access = await requireManagedEventAccess(id)
    if ('error' in access) return access.error

    const { searchParams } = new URL(req.url)
    const registrationId = String(searchParams.get('registrationId') ?? '').trim()
    const userId = String(searchParams.get('userId') ?? '').trim()

    if (!registrationId && !userId) {
      return NextResponse.json({ error: 'registrationId or userId required' }, { status: 400 })
    }

    const supa = getProfileServiceClient()
    if (supa) {
      let query = supa.from('registrations').delete().eq('event_id', id)
      query = registrationId ? query.eq('id', registrationId) : query.eq('user_id', userId)
      const { error } = await query
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    const rows = devStore.getAll<RegistrationDb>('registrations')
    const match = rows.find((row) =>
      row.event_id === id && (registrationId ? row.id === registrationId : row.user_id === userId),
    )
    if (!match?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    devStore.remove('registrations', match.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/events/[id]/registrations error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
