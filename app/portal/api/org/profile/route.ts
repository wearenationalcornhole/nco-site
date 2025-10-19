export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/** Temporary stand-in until Auth lands */
const DEMO_ORG_EMAIL = process.env.DEMO_ORG_EMAIL ?? 'demo@wearenationalcornhole.com'

type UserShape = {
  id?: string
  email: string
  name?: string | null
  city?: string | null
  state?: string | null
  profile_image?: string | null
  role?: string | null
}

type ClubShape = {
  id: string
  name: string
  city?: string | null
  state?: string | null
  logo_url?: string | null
  website?: string | null
}

function assureDevUser(): UserShape {
  // find or create a dev user
  const users = devStore.getAll<UserShape>('users')
  let u = users.find((x) => x.email === DEMO_ORG_EMAIL)
  if (!u) {
    u = devStore.upsert<UserShape>('users', {
      email: DEMO_ORG_EMAIL,
      name: 'Demo Organizer',
      role: 'organizer',
      city: null,
      state: null,
      profile_image: null,
    })
  }
  return u
}

export async function GET() {
  try {
    const prisma = await getPrisma()
    let user: UserShape | null = null
    let club: ClubShape | null = null

    if (prisma) {
      user = await prisma.users.findFirst({ where: { email: DEMO_ORG_EMAIL } }) as any
      if (!user) {
        // seed a minimal organizer row on first hit (optional)
        user = await prisma.users.create({
          data: {
            email: DEMO_ORG_EMAIL,
            name: 'Demo Organizer',
            role: 'organizer',
          },
        }) as any
      }

      // Try to fetch a club for this user (via club_members)
      const membership = await prisma.club_members.findFirst({
        where: { user_id: user.id! },
      })
      if (membership) {
        club = await prisma.clubs.findUnique({ where: { id: membership.club_id } }) as any
      }
    } else {
      const devUser = assureDevUser()
      user = devUser

      const membership = devStore.getAll<any>('club_members').find((m) => m.user_id === devUser.id)
      club = membership ? devStore.getById<ClubShape>('clubs', membership.club_id) ?? null : null
    }

    return NextResponse.json({
      user,
      club,
    })
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { name, city, state, profile_image, clubName } = await req.json()

    const prisma = await getPrisma()
    let user: UserShape | null = null
    let club: ClubShape | null = null

    if (prisma) {
      // Upsert user by email
      user = await prisma.users.upsert({
        where: { email: DEMO_ORG_EMAIL },
        create: {
          email: DEMO_ORG_EMAIL,
          name: name ?? null,
          city: city ?? null,
          state: state ?? null,
          profile_image: profile_image ?? null,
          role: 'organizer',
        },
        update: {
          name: name ?? null,
          city: city ?? null,
          state: state ?? null,
          profile_image: profile_image ?? null,
        },
      }) as any

      // Link/create a club if clubName provided
      if (clubName && String(clubName).trim().length > 0) {
        club = await prisma.clubs.upsert({
          where: { name: clubName },
          create: { name: clubName },
          update: {},
        }) as any

        // Ensure membership
        const existing = await prisma.club_members.findFirst({
          where: { user_id: user.id!, club_id: club.id },
        })
        if (!existing) {
          await prisma.club_members.create({
            data: { user_id: user.id!, club_id: club.id, role: 'organizer' },
          })
        }
      } else {
        // no club change
        const membership = await prisma.club_members.findFirst({ where: { user_id: user.id! } })
        if (membership) {
          club = await prisma.clubs.findUnique({ where: { id: membership.club_id } }) as any
        }
      }
    } else {
      // devStore fallback
      const devUser = assureDevUser()
      user = devStore.upsert<UserShape>('users', {
        ...devUser,
        name: name ?? devUser.name ?? null,
        city: city ?? devUser.city ?? null,
        state: state ?? devUser.state ?? null,
        profile_image: profile_image ?? devUser.profile_image ?? null,
      })

      if (clubName && String(clubName).trim().length > 0) {
        // find or create club
        let existingClub = devStore.getAll<ClubShape>('clubs').find((c) => c.name === clubName) ?? null
        if (!existingClub) {
          existingClub = devStore.upsert<ClubShape>('clubs', { name: clubName })
        }
        club = existingClub

        // ensure membership
        const existingMem = devStore.getAll<any>('club_members').find(
          (m) => m.user_id === user.id && m.club_id === club.id
        )
        if (!existingMem) {
          devStore.upsert('club_members', { user_id: user.id, club_id: club.id, role: 'organizer' })
        }
      } else {
        // no club change
        const membership = devStore.getAll<any>('club_members').find((m) => m.user_id === user!.id)
        club = membership ? devStore.getById<ClubShape>('clubs', membership.club_id) ?? null : null
      }
    }

    return NextResponse.json({ ok: true, user, club })
  } catch (e: any) {
    console.error('PUT /portal/api/org/profile error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}