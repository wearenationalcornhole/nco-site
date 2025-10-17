export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

/**
 * DELETE /portal/api/registrations/[id]
 */
export async function DELETE(_req: Request, context: any) {
  try {
    const id = context.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      await prisma.registration.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    const ok = devStore.remove('registrations', id)
    return NextResponse.json({ ok })
  } catch (e) {
    console.error('DELETE /portal/api/registrations/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}