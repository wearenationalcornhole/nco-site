// app/portal/api/org/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

const DEMO_EMAIL = 'organizer@example.com'
const DEMO_NAME = 'Demo Organizer'

type UserShape = {
  id?: string
  email: string
  name?: string | null
  city?: string | null
  state?: string | null
  profile_image?: string | null
  role?: string | null
}

export async function GET() {
  try {
    const prisma = await getPrisma()

    // Guard: make sure the generated client actually has our models
    const hasModels =
      !!prisma &&
      typeof (prisma as any).users?.findFirst === 'function' &&
      typeof (prisma as any).clubs?.findFirst === 'function' &&
      typeof (prisma as any).club_members?.findFirst === 'function'

    if (hasModels) {
      // 1) Ensure demo user
      let user = await (prisma as any).users.findFirst({ where: { email: DEMO_EMAIL } })
      if (!user) {
        user = await (prisma as any).users.create({
          data: {
            email: DEMO_EMAIL,
            name: DEMO_NAME,
            role: 'organizer',
            city: 'Boston',
            state: 'MA',
            profile_image: null,
          },
        })
      }

      // 2) Ensure membership/club
      let membership = await (prisma as any).club_members.findFirst({
        where: { user_id: user.id },
        include: { club: true },
      })
      if (!membership) {
        const club = await (prisma as any).clubs.create({
          data: { name: 'Your Club', city: 'Boston', state: 'MA', logo_url: null, website: null },
        })
        membership = await (prisma as any).club_members.create({
          data: { user_id: user.id, club_id: club.id, role: 'organizer' },
          include: { club: true },
        })
      }

      return NextResponse.json({
        source: 'prisma',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          city: user.city,
          state: user.state,
          profile_image: user.profile_image,
          role: user.role,
        },
        club: membership?.club
          ? {
              id: membership.club.id,
              name: membership.club.name,
              city: membership.club.city,
              state: membership.club.state,
              logo_url: membership.club.logo_url,
              website: membership.club.website,
            }
          : null,
      })
    }

    // Fallback: devStore
    let user = devStore.getAll<UserShape>('users').find((u) => u.email === DEMO_EMAIL)
    if (!user) {
      user = devStore.upsert<UserShape>('users', {
        email: DEMO_EMAIL,
        name: DEMO_NAME,
        role: 'organizer',
        city: 'Boston',
        state: 'MA',
        profile_image: null,
      })
    }

    let membership = devStore.getAll<any>('club_members').find((m) => m.user_id === user!.id)
    let club = membership ? devStore.getById<any>('clubs', membership.club_id) : null
    if (!club) {
      club = devStore.upsert<any>('clubs', {
        name: 'Your Club',
        city: 'Boston',
        state: 'MA',
        logo_url: null,
        website: null,
      })
      devStore.upsert<any>('club_members', { club_id: club.id, user_id: user!.id!, role: 'organizer' })
    }

    return NextResponse.json({
      source: 'devStore',
      user,
      club: club
        ? { id: club.id, name: club.name, city: club.city, state: club.state, logo_url: club.logo_url, website: club.website }
        : null,
    })
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}