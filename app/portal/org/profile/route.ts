// app/portal/api/org/profile/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

const DEMO_USER_ID = 'demo-user-1'
const DEMO_EMAIL = 'demo@wearenationalcornhole.com'

export async function GET() {
  try {
    const prisma = await getPrisma()

    if (prisma) {
      // Only select columns we know exist everywhere: id, email, name
      let user = await prisma.users.findFirst({
        select: { id: true, email: true, name: true },
      })

      if (!user) {
        user = await prisma.users.create({
          data: { email: DEMO_EMAIL, name: 'Demo Organizer' },
          select: { id: true, email: true, name: true },
        })
      }

      // Try to find a club via membership, all fields optional
      const membership = await prisma.club_members.findFirst({
        where: { user_id: user.id },
        select: { club_id: true },
      })

      let club: { id: string; name: string } | null = null
      if (membership?.club_id) {
        const c = await prisma.clubs.findUnique({
          where: { id: membership.club_id },
          select: { id: true, name: true },
        })
        if (c) club = { id: c.id, name: c.name }
      }

      return NextResponse.json({ user, club })
    }

    // ── Fallback: devStore (local / no DB) ────────────────────────────
    let user = devStore.getById<any>('users', DEMO_USER_ID)
    if (!user) {
      user = devStore.upsert('users', { id: DEMO_USER_ID, email: DEMO_EMAIL, name: 'Demo Organizer' })
    }

    let club = (devStore.getAll<any>('clubs')[0]) as any
    if (!club) {
      club = devStore.upsert('clubs', { name: 'Demo Cornhole Club' })
      devStore.upsert('club_members', { club_id: club.id, user_id: user.id, role: 'organizer' })
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name ?? null },
      club: { id: club.id, name: club.name },
    })
  } catch (e: any) {
    console.error('GET /portal/api/org/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}