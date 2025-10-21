// app/portal/api/events/[id]/register/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabaseServer'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }
    const prisma = await getPrisma()

    // ✅ Await Supabase client creation
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // -- Check if already registered
    if (prisma) {
      const existing = await prisma.registrations.findFirst({
        where: { event_id: id, user_id: userId },
      })
      if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })

      const created = await prisma.registrations.create({
        data: {
          event_id: id,
          user_id: userId,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }

    // -- devStore fallback
    const existing = devStore
      .getAll('registrations')
      .find((r) => r.event_id === id && r.user_id === userId)
    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })

    const created = devStore.upsert('registrations', {
      event_id: id,
      user_id: userId,
      created_at: new Date(),
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/register error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}