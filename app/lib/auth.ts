// app/lib/auth.ts
import { redirect } from 'next/navigation'
import { getSession } from './supabaseServer'
import { getPrisma } from './safePrisma'

export type Role = 'player' | 'organizer' | 'admin'

export async function requireOrganizer() {
  const session = await getSession()
  if (!session?.user) redirect('/portal/login') // not signed in

  const prisma = await getPrisma()
  if (!prisma) {
    // dev fallback: allow through
    return
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  }).catch(() => null)

  const role = (user?.role ?? 'player') as Role
  if (role !== 'organizer' && role !== 'admin') {
    redirect('/portal') // signed in but not organizer/admin
  }
}