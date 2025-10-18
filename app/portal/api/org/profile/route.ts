// app/portal/api/org/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * Demo: single organizer identity
 * Replace with real auth later.
 */
const DEMO_USER_ID = 'demo-user-1'
const DEMO_EMAIL   = 'organizer@example.com'

export async function GET() {
  try {
    const prisma = await getPrisma()
    if (prisma) {
      // users table (snake_case) per your schema
      let user = await prisma.users.findUnique({ where: { id: DEMO_USER_ID } })
      if (!user) {
        user = await prisma.users.create({
          data: { id: DEMO_USER_ID, email: DEMO_EMAIL, name: 'Demo Organizer' },
        })
      }

      // club membership (optional)
      const member = await prisma.club_members.findFirst({
        where: { user_id: DEMO_USER_ID },
        include: { club: true },
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        profile_image: (user as any).profile_image ?? null,
        club: member?.club ? { id: member.club.id, name: member.club.name } : null,
      })
    }

    // devStore fallback
    let user = devStore.getById('users', DEMO_USER_ID)
    if (!user) {
      user = devStore.upsert('users', { id: DEMO_USER_ID, email: DEMO_EMAIL, name: 'Demo Organizer' })
    }

    const membership = devStore.getAll('club_members').find((m) => m.user_id === DEMO_USER_ID)
    const club = membership ? devStore.getById('clubs', membership.club_id) : null

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      profile_image: user.profile_image ?? null,
      club: club ? { id: club.id, name: club.name } : null,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { email, name, profile_image, clubName } = await req.json()

    const prisma = await getPrisma()
    if (prisma) {
      // upsert user
      let user = await prisma.users.findUnique({ where: { id: DEMO_USER_ID } })
      if (!user) {
        user = await prisma.users.create({ data: { id: DEMO_USER_ID, email: email ?? DEMO_EMAIL, name: name ?? null, profile_image: profile_image ?? null } })
      } else {
        user = await prisma.users.update({
          where: { id: DEMO_USER_ID },
          data: {
            email: email ?? user.email,
            name: name ?? user.name,
            profile_image: profile_image ?? (user as any).profile_image ?? null,
          },
        })
      }

      // optional club linking/creation
      let clubData: { id: string; name: string } | null = null
      if (clubName && clubName.trim()) {
        let club = await prisma.clubs.findFirst({ where: { name: clubName.trim() } })
        if (!club) {
          club = await prisma.clubs.create({ data: { name: clubName.trim() } })
        }
        // ensure membership
        const existing = await prisma.club_members.findFirst({ where: { club_id: club.id, user_id: DEMO_USER_ID } })
        if (!existing) {
          await prisma.club_members.create({ data: { club_id: club.id, user_id: DEMO_USER_ID, role: 'organizer' } })
        }
        clubData = { id: club.id, name: club.name }
      } else {
        // if clubName cleared, leave membership as-is (simple rule for now)
      }

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        profile_image: (user as any).profile_image ?? null,
        club: clubData,
      })
    }

    // devStore fallback
    let user = devStore.getById('users', DEMO_USER_ID)
    if (!user) user = devStore.upsert('users', { id: DEMO_USER_ID, email: DEMO_EMAIL })

    user = devStore.upsert('users', {
      ...user,
      email: email ?? user.email,
      name: name ?? user.name,
      profile_image: profile_image ?? user.profile_image ?? null,
    })

    let clubData: { id: string; name: string } | null = null
    if (clubName && clubName.trim()) {
      let club = devStore.getAll('clubs').find((c) => (c.name ?? '').toLowerCase() === clubName.trim().toLowerCase())
      if (!club) {
        club = devStore.upsert('clubs', { name: clubName.trim() })
      }
      const existing = devStore.getAll('club_members').find((m) => m.club_id === club.id && m.user_id === DEMO_USER_ID)
      if (!existing) {
        devStore.upsert('club_members', { club_id: club.id, user_id: DEMO_USER_ID, role: 'organizer' })
      }
      clubData = { id: club.id, name: club.name }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      profile_image: user.profile_image ?? null,
      club: clubData,
    })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}