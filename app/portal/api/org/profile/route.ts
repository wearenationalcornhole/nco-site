// app/portal/api/org/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * Simple organizer "profile" bootstrap:
 * - If Prisma is available: upsert a demo user + club + membership, then return them.
 * - If not: use in-memory devStore to do the same.
 *
 * This keeps the Organizer Profile page stable in all environments.
 */

type UserShape = {
  id?: string
  email: string
  name?: string | null
  city?: string | null
  state?: string | null
  profile_image?: string | null
  role?: string | null
}

const DEMO_EMAIL = 'organizer.demo@nco.local'
const DEMO_USER_NAME = 'Demo Organizer'
const DEMO_CITY = 'Nashville'
const DEMO_STATE = 'TN'
const DEMO_ROLE = 'organizer'
const DEMO_CLUB_NAME = 'Demo Cornhole Club'

export async function GET() {
  try {
    const prisma = await getPrisma()

    // ─────────────────────────────────────────────────────────────
    // Prisma path
    // ─────────────────────────────────────────────────────────────
    if (prisma) {
      // 1) Ensure a demo user exists
      let user = await prisma.users.findFirst({ where: { email: DEMO_EMAIL } })
      if (!user) {
        user = await prisma.users.create({
          data: {
            email: DEMO_EMAIL,
            name: DEMO_USER_NAME,
            city: DEMO_CITY,
            state: DEMO_STATE,
            profile_image: null,
            role: DEMO_ROLE,
          },
        })
      } else {
        // Make sure these columns exist / are populated (you added them in Supabase)
        if (user.role !== DEMO_ROLE || !user.city || !user.state) {
          user = await prisma.users.update({
            where: { id: user.id },
            data: {
              role: DEMO_ROLE,
              city: user.city ?? DEMO_CITY,
              state: user.state ?? DEMO_STATE,
            },
          })
        }
      }

      // 2) Ensure a demo club exists
      let club = await prisma.clubs.findFirst({ where: { name: DEMO_CLUB_NAME } })
      if (!club) {
        club = await prisma.clubs.create({
          data: {
            name: DEMO_CLUB_NAME,
            city: DEMO_CITY,
            state: DEMO_STATE,
            logo_url: null,
            website: null,
          },
        })
      }

      // 3) Ensure membership exists
      const membership = await prisma.club_members.findFirst({
        where: { club_id: club.id, user_id: user.id },
      })
      if (!membership) {
        await prisma.club_members.create({
          data: { club_id: club.id, user_id: user.id, role: 'organizer' },
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
        } as UserShape,
        club: { id: club.id, name: club.name },
      })
    }

    // ─────────────────────────────────────────────────────────────
    // devStore fallback
    // ─────────────────────────────────────────────────────────────
    // users
    let user =
      devStore.getAll<UserShape>('users').find((u) => u.email === DEMO_EMAIL) ??
      devStore.upsert<UserShape>('users', {
        email: DEMO_EMAIL,
        name: DEMO_USER_NAME,
        city: DEMO_CITY,
        state: DEMO_STATE,
        profile_image: null,
        role: DEMO_ROLE,
      })

    // clubs
    let club =
      devStore.getAll<any>('clubs').find((c) => c.name === DEMO_CLUB_NAME) ??
      devStore.upsert<any>('clubs', { name: DEMO_CLUB_NAME, city: DEMO_CITY, state: DEMO_STATE })

    // membership
    const hasMembership = devStore
      .getAll<any>('club_members')
      .some((m) => m.user_id === user.id && m.club_id === club.id)
    if (!hasMembership) {
      devStore.upsert<any>('club_members', { user_id: user.id, club_id: club.id, role: 'organizer' })
    }

    return NextResponse.json({
      source: 'devStore',
      user,
      club: { id: club.id, name: club.name },
    })
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}