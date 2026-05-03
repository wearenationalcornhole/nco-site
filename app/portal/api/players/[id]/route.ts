// app/portal/api/players/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'
import { getUsersModel } from '@/app/lib/prismaModels'

function toPlayer(row: any) {
  return {
    id: String(row.id),
    name: row.name ?? null,
    email: row.email ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at ?? null,
  }
}

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const Users = getUsersModel(prisma)
      if (!Users) throw new Error('Model users not found')
      const user = await Users.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, created_at: true },
      })
      if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(toPlayer(user))
    }

    const row = devStore.getById('users', id)
    return row ? NextResponse.json(toPlayer(row)) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    console.error('GET /portal/api/players/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : undefined

    const prisma = await getPrisma()
    if (prisma) {
      const Users = getUsersModel(prisma)
      if (!Users) throw new Error('Model users not found')
      const updated = await Users.update({
        where: { id },
        data: { ...(name !== undefined ? { name } : {}) },
        select: { id: true, name: true, email: true, created_at: true },
      })
      return NextResponse.json(toPlayer(updated))
    }

    const row = devStore.getById<any>('users', id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('users', { ...row, ...(name !== undefined ? { name } : {}) })
    return NextResponse.json(toPlayer(updated))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      const Users = getUsersModel(prisma)
      if (!Users) throw new Error('Model users not found')
      await Users.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    const ok = devStore.remove('users', id)
    return NextResponse.json({ ok })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Delete failed' }, { status: 400 })
  }
}
