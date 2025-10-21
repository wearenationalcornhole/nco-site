// app/portal/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type Role = 'player' | 'organizer' | 'admin'

export default async function PortalLanding() {
  // 1) Get session from Supabase (server-side)
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()

  // 2) Not signed in? → Login
  if (!session) {
    redirect('/portal/login')
  }

  // 3) Look up the user's role (DB first, then dev fallback)
  const email = session.user.email ?? ''
  let role: Role = 'player'

  try {
    const prisma = await getPrisma()
    if (prisma && email) {
      const user = await prisma.users.findFirst({ where: { email } }) as { role?: string } | null
      if (user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'player') {
        role = user.role
      }
    } else {
      // devStore fallback
      const users = devStore.getAll<{ email?: string; role?: string }>('users')
      const u = users.find(u => (u.email ?? '').toLowerCase() === email.toLowerCase())
      if (u?.role === 'organizer' || u?.role === 'admin' || u?.role === 'player') {
        role = u.role as Role
      }
    }
  } catch {
    // If lookup fails, we’ll just treat as player.
  }

  // 4) Role-based redirect
  if (role === 'admin') {
    redirect('/portal/admin')      // (you can add this section later; for now it can 404)
  } else if (role === 'organizer') {
    redirect('/portal/org')
  } else {
    redirect('/portal/events')
  }
}