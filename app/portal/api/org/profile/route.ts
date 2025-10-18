// app/portal/api/org/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * Organizer profile bootstrap endpoint.
 * - If Prisma is available: ensures a demo organizer user + club exist in DB.
 * - If not: uses devStore (in-memory) to simulate the same shape.
 * Returns: { user: { id, email, name }, club: { id, name } }
 */
export async function GET(_req: Request) {
  try {
    const prisma = await getPrisma()
    const DEMO_EMAIL = 'demo@user.test'
    const DEMO_NAME = 'Demo User'

    // ─────────────────────────────────────────────────────────────
    // Prisma branch (real DB)
    // ─────────────────────────────────────────────────────────────
    if (prisma) {
      // 1) Ensure user exists
      let user = await prisma.users.findFirst({ where: { email: DEMO_EMAIL } })
      if (!user) {
        user = await prisma.users.create({
          data: { email: DEMO_EMAIL, name: DEMO_NAME, role: 'organizer' },
        })
      }

      // 2) Find club membership (any club) for this user
      let membership = await prisma.club_members.findFirst({
        where: { user_id: user.id },
      })

      // 3) Load or create a club
      let club = membership
        ? await prisma.clubs.findUnique({ where: { id: membership.club_id } })
        : null

      if (!club) {
        club = await prisma.clubs.create({
          data: { name: 'Demo Cornhole Club' },
        })
        // create membership
        await prisma.club_members.create({
          data: { club_id: club.id, user_id: user.id, role: 'organizer' },
        })
      }

      return NextResponse.json({
        source: 'prisma',
        user: { id: String(user.id), email: String(user.email), name: String(user.name ?? '') },
        club: { id: String(club.id), name: String(club.name ?? '') },
      })
    }

    // ─────────────────────────────────────────────────────────────
    // devStore branch (in-memory fallback)
    // ─────────────────────────────────────────────────────────────
    const DEMO_USER_ID = 'demo-user-1'

    // Ensure a demo user
    if (!devStore.getById('users', DEMO_USER_ID)) {
      devStore.upsert('users', { id: DEMO_USER_ID, email: DEMO_EMAIL, name: DEMO_NAME })
    }

    // Find existing membership + club
    const membership = devStore.getAll('club_members').find((m) => m.user_id === DEMO_USER_ID)
    const club = membership ? devStore.getById('clubs', membership.club_id) : null

    let clubData: { id: string; name: string }

    if (club) {
      // Coerce to strings to satisfy TS
      const cid = String((club as any).id ?? '')
      const cname = String((club as any).name ?? '')
      clubData = { id: cid, name: cname }
    } else {
      // Create a demo club + membership
      const created = devStore.upsert('clubs', { name: 'Demo Cornhole Club' }) as any
      const cid = String(created.id ?? '')
      devStore.upsert('club_members', { club_id: cid, user_id: DEMO_USER_ID, role: 'organizer' })
      clubData = { id: cid, name: String(created.name ?? '') }
    }

    return NextResponse.json({
      source: 'devStore',
      user: { id: DEMO_USER_ID, email: DEMO_EMAIL, name: DEMO_NAME },
      club: clubData,
    })
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e?.message || e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}