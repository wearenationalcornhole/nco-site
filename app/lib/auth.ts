// app/lib/auth.ts
import { redirect } from 'next/navigation'
import { getSession } from './supabaseServer'
import { getPrisma } from './safePrisma'

export type Role = 'player' | 'organizer' | 'admin'

export async function requireSession(opts?: { redirectTo?: string }) {
  const session = await getSession()
  if (!session) {
    redirect(opts?.redirectTo ?? '/portal/login')
  }
  return session
}

export async function requireOrganizer() {
  const session = await requireSession()
  const prisma = await getPrisma()

  // If DB is connected, check the user's role in `users.role`.
  if (prisma) {
    const user = await prisma.users.findFirst({
      where: { email: session.user.email ?? '' },
      select: { role: true },
    })
    const role = (user?.role ?? 'player') as Role
    if (role !== 'organizer' && role !== 'admin') {
      redirect('/portal') // or show a 403 page
    }
    return { session, role }
  }

  // Dev fallback: allow everyone as organizer in local dev
  return { session, role: 'organizer' as Role }
}