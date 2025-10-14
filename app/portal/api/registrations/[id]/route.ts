import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const prisma = getPrisma()
  if (prisma) {
    await prisma.registration.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
  devStore.remove('registrations', id)
  return NextResponse.json({ ok: true })
}