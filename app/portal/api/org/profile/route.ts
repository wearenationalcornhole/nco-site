// app/portal/api/org/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

// Demo identity (until real auth)
const DEMO_EMAIL = 'organizer@example.com'
const DEMO_USER_ID = 'demo-user-1'

type UserShape = {
  id?: string // optional for devStore create
  email: string
  name?: string | null
  city?: string | null
  state?: string | null
  profile_image?: string | null
  role?: string | null
  created_at?: string | Date | null
}

type ClubShape = {
  id?: string // optional for devStore create
  name: string
  city?: string | null
  state?: string | null
  logo_url?: string | null
  website?: string | null
  created_at?: string | Date | null
}

type ClubMemberShape = {
  id?: string // optional for devStore create
  club_id: string
  user_id: string
  role?: string | null
  joined_at?: string | Date | null
}

// Helpers
function iso(d?: string | Date | null) {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function GET() {
  try {
    const prisma = await getPrisma()

    // ─────────────────────────────────────────────────────────
    // PRISMA PATH
    // ─────────────────────────────────────────────────────────
    if (prisma) {
      // 1) Ensure a demo user exists (or fetch existing)
      let user = (await prisma.users.findFirst({
        where: { email: DEMO_EMAIL },
      })) as unknown as UserShape | null

      if (!user) {
        user = (await prisma.users.create({
          data: {
            email: DEMO_EMAIL,
            name: 'Demo Organizer',
            city: 'Boston',
            state: 'MA',
            profile_image: null,
            role: 'organizer',
          },
        })) as unknown as UserShape
      }

      // 2) Find (or create) a club for that user
      let club: ClubShape | null = null
      if (user?.id) {
        const membership = (await prisma.club_members.findFirst({
          where: { user_id: user.id },
        })) as unknown as ClubMemberShape | null

        if (membership) {
          club = (await prisma.clubs.findUnique({
            where: { id: membership.club_id },
          })) as unknown as ClubShape | null
        } else {
          // Create a default club and connect user as organizer
          club = (await prisma.clubs.create({
            data: {
              name: 'Demo Cornhole Club',
              city: 'Boston',
              state: 'MA',
              logo_url: null,
              website: null,
            },
          })) as unknown as ClubShape

          if (club?.id && user?.id) {
            await prisma.club_members.create({
              data: {
                club_id: club.id,
                user_id: user.id,
                role: 'organizer',
              },
            })
          }
        }
      }

      return NextResponse.json({
        source: 'prisma',
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name ?? null,
              city: user.city ?? null,
              state: user.state ?? null,
              profile_image: user.profile_image ?? null,
              role: user.role ?? null,
              created_at: iso(user.created_at),
            }
          : null,
        club: club
          ? {
              id: club.id,
              name: club.name,
              city: club.city ?? null,
              state: club.state ?? null,
              logo_url: club.logo_url ?? null,
              website: club.website ?? null,
              created_at: iso(club.created_at),
            }
          : null,
      })
    }

    // ─────────────────────────────────────────────────────────
    // DEVSTORE PATH (fallback)
    // ─────────────────────────────────────────────────────────
    // Ensure demo user in devStore
    let user = devStore.getAll<UserShape>('users').find((u) => u.email === DEMO_EMAIL) ?? null
    if (!user) {
      user = devStore.upsert<UserShape>('users', {
        id: DEMO_USER_ID, // we give a stable id for demo
        email: DEMO_EMAIL,
        name: 'Demo Organizer',
        city: 'Boston',
        state: 'MA',
        profile_image: null,
        role: 'organizer',
        created_at: new Date(),
      })
    }

    // Ensure a demo club & membership
    let club: ClubShape | null = null
    if (user?.id) {
      const membership =
        devStore.getAll<ClubMemberShape>('club_members').find((m) => m.user_id === user.id) ?? null

      if (membership) {
        club = devStore.getById<ClubShape>('clubs', membership.club_id) ?? null
      } else {
        // create club + membership
        club = devStore.upsert<ClubShape>('clubs', {
          name: 'Demo Cornhole Club',
          city: 'Boston',
          state: 'MA',
          logo_url: null,
          website: null,
          created_at: new Date(),
        })
        if (club?.id) {
          devStore.upsert<ClubMemberShape>('club_members', {
            club_id: club.id,
            user_id: user.id,
            role: 'organizer',
            joined_at: new Date(),
          })
        }
      }
    }

    return NextResponse.json({
      source: 'devStore',
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            city: user.city ?? null,
            state: user.state ?? null,
            profile_image: user.profile_image ?? null,
            role: user.role ?? null,
            created_at: iso(user.created_at),
          }
        : null,
      club: club
        ? {
            id: club.id,
            name: club.name,
            city: club.city ?? null,
            state: club.state ?? null,
            logo_url: club.logo_url ?? null,
            website: club.website ?? null,
            created_at: iso(club.created_at),
          }
        : null,
    })
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}