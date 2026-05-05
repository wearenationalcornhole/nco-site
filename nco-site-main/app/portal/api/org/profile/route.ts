export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireRouteRoles, splitDisplayName } from '@/app/lib/portalRouteAccess'

type ProfileRow = {
  id: string
  email?: string | null
  role?: string | null
  first_name?: string | null
  last_name?: string | null
  city?: string | null
  region?: string | null
  primary_club_id?: string | null
}

type ClubRow = {
  id: string
  name: string
  city?: string | null
  state?: string | null
  logo_url?: string | null
  website?: string | null
}

type Body = {
  name?: string | null
  city?: string | null
  state?: string | null
  clubName?: string | null
}

function buildResponse(
  actor: { user: { id: string; email?: string | null }; role: string | null },
  profile: ProfileRow | null,
  club: ClubRow | null,
) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()

  return {
    user: {
      id: actor.user.id,
      email: actor.user.email ?? profile?.email ?? '',
      name: fullName || null,
      city: profile?.city ?? null,
      state: profile?.region ?? null,
      role: profile?.role ?? actor.role ?? null,
    },
    club: club
      ? {
          id: club.id,
          name: club.name,
          city: club.city ?? null,
          state: club.state ?? null,
          logo_url: club.logo_url ?? null,
          website: club.website ?? null,
        }
      : null,
  }
}

async function getClubById(supabase: any, clubId: string | null | undefined) {
  if (!clubId) return null

  const { data } = await supabase
    .from('clubs')
    .select('id,name,city,state,logo_url,website')
    .eq('id', clubId)
    .maybeSingle()

  return (data as ClubRow | null) ?? null
}

async function getOrCreateClubByName(
  supabase: any,
  clubName: string | null,
  city: string | null,
  state: string | null,
) {
  const normalized = String(clubName ?? '').trim()
  if (!normalized) return null

  const { data: existing } = await supabase
    .from('clubs')
    .select('id,name,city,state,logo_url,website')
    .ilike('name', normalized)
    .limit(1)
    .maybeSingle()

  if (existing) return existing as ClubRow

  const { data: created, error } = await supabase
    .from('clubs')
    .insert({
      name: normalized,
      city: city || null,
      state: state || null,
    })
    .select('id,name,city,state,logo_url,website')
    .single()

  if (error) throw error
  return created as ClubRow
}

export async function GET() {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const { actor } = access
    const { data: profile, error } = await actor.supabase
      .from('profiles')
      .select('id,email,role,first_name,last_name,city,region,primary_club_id')
      .eq('id', actor.user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const profileRow = (profile as ProfileRow | null) ?? null
    const club = await getClubById(actor.supabase, profileRow?.primary_club_id)
    return NextResponse.json(buildResponse(actor, profileRow, club))
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const { actor } = access
    const body = (await req.json().catch(() => ({}))) as Body
    const name = String(body.name ?? '').trim()
    const city = String(body.city ?? '').trim() || null
    const state = String(body.state ?? '').trim() || null
    const clubName = String(body.clubName ?? '').trim() || null

    const { firstName, lastName } = splitDisplayName(name)
    const club = await getOrCreateClubByName(actor.supabase, clubName, city, state)

    const upsertPayload = {
      id: actor.user.id,
      email: actor.user.email ?? null,
      role: actor.role,
      first_name: firstName,
      last_name: lastName,
      city,
      region: state,
      primary_club_id: club?.id ?? null,
    }

    const { error } = await actor.supabase
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: profile, error: refreshError } = await actor.supabase
      .from('profiles')
      .select('id,email,role,first_name,last_name,city,region,primary_club_id')
      .eq('id', actor.user.id)
      .maybeSingle()

    if (refreshError) {
      return NextResponse.json({ error: refreshError.message }, { status: 500 })
    }

    return NextResponse.json(buildResponse(actor, (profile as ProfileRow | null) ?? null, club))
  } catch (e: any) {
    console.error('PUT /portal/api/org/profile error:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
