export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      await prisma.registration.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    devStore.remove('registrations', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/registrations/[id] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}