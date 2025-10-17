export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const user = await prisma.users.findUnique({ where: { id } })
      if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(user)
    }

    const user = devStore.getById<any>('users', id)
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    const body = await req.json()
    const data: any = {}
    if (typeof body.name !== 'undefined') data.name = body.name
    if (typeof body.email !== 'undefined') data.email = body.email

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.users.update({ where: { id }, data })
      return NextResponse.json(updated)
    }

    const prev = devStore.getById<any>('users', id)
    if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('users', { ...prev, ...data })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      await prisma.users.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    const ok = devStore.remove('users', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}