// app/lib/auth.ts
import { redirect } from 'next/navigation'
import { getPrisma } from './safePrisma'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { getSession } from './supabaseServer'

export type Role = 'player' | 'organizer' | 'admin'

// ──────────────────────────────────────────────
// Existing: Require organizer or admin access
// ──────────────────────────────────────────────
export async function requireOrganizer() {
  const session = await getSession()
  if (!session?.user) redirect('/portal/login') // not signed in

  const prisma = await getPrisma()
  if (!prisma) {
    // dev fallback: allow through
    return
  }

  const user = await prisma.users
    .findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    .catch(() => null)

  const role = (user?.role ?? 'player') as Role
  if (role !== 'organizer' && role !== 'admin') {
    redirect('/portal') // signed in but not organizer/admin
  }
}

// ──────────────────────────────────────────────
// New: Safe optional session getter (for TopBar, etc.)
// ──────────────────────────────────────────────
export async function getOptionalSession() {
  try {
    const { createServerClient } = await import('./supabaseServer')
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session ?? null
  } catch {
    return null
  }
}