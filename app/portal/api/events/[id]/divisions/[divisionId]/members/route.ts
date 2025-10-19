// app/portal/api/events/[id]/divisions/[divisionId]/members/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

type MemberRow = {
  id?: string
  division_id: string
  user_id: string
  created_at?: string | Date | null
}

type MemberOut = {
  id: string
  userId: string
  createdAt: string | null
}

function asIso(d: string | Date | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

export async function GET(_req: Request, context: any) {
  try {
    const { divisionId } = context.params as { id: string; divisionId: string }
    const prisma = await getPrisma()
    if (prisma) {
      const rows = (await prisma.event_division_members.findMany({
        where: { division_id: divisionId },
        orderBy: { created_at: 'desc' },
      })) as unknown as MemberRow[]

      const out: MemberOut[] = rows.map((r) => ({
        id: r.id!,
        userId: r.user_id,
        createdAt: asIso(r.created_at),
      }))
      return NextResponse.json(out)
    }

    const rows = devStore.getAll<MemberRow>('event_division_members').filter((m) => m.division_id === divisionId)
    const out: MemberOut[] = rows
      .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
      .map((r) => ({ id: r.id!, userId: r.user_id, createdAt: asIso(r.created_at) }))
    return NextResponse.json(out)
  } catch (e: any) {
    console.error('GET /portal/api/events/[id]/divisions/[divisionId]/members error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id: eventId, divisionId } = context.params as { id: string; divisionId: string }
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? '').trim()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const prisma = await getPrisma()
    if (prisma) {
      // Optional safety: ensure user is registered for the event
      const reg = await prisma.registrations.findFirst({ where: { event_id: eventId, user_id: userId } })
      if (!reg) return NextResponse.json({ error: 'User not registered for event' }, { status: 400 })

      const created = (await prisma.event_division_members.create({
        data: { division_id: divisionId, user_id: userId },
      })) as unknown as MemberRow

      const out: MemberOut = { id: created.id!, userId: created.user_id, createdAt: asIso(created.created_at) }
      return NextResponse.json(out, { status: 201 })
    }

    // dev fallback: ensure registration exists
    const hasReg = devStore
      .getAll<{ event_id: string; user_id: string }>('registrations')
      .some((r) => r.event_id === eventId && r.user_id === userId)
    if (!hasReg) return NextResponse.json({ error: 'User not registered for event' }, { status: 400 })

    const created = devStore.upsert<MemberRow>('event_division_members', {
      division_id: divisionId,
      user_id: userId,
      created_at: new Date(),
    })
    const out: MemberOut = { id: created.id!, userId: created.user_id, createdAt: asIso(created.created_at) }
    return NextResponse.json(out, { status: 201 })
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/divisions/[divisionId]/members error:', e)
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const { divisionId } = context.params as { id: string; divisionId: string }
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')?.trim()
    const memberId = url.searchParams.get('memberId')?.trim()
    if (!userId && !memberId) {
      return NextResponse.json({ error: 'Provide userId or memberId' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      if (memberId) {
        await prisma.event_division_members.delete({ where: { id: memberId } })
      } else {
        await prisma.event_division_members.delete({
          where: { division_id_user_id: { division_id: divisionId, user_id: userId! } } as any,
        })
      }
      return NextResponse.json({ ok: true })
    }

    // dev fallback
    const rows = devStore.getAll<MemberRow>('event_division_members')
    const target = memberId
      ? rows.find((m) => m.id === memberId)
      : rows.find((m) => m.division_id === divisionId && m.user_id === userId)

    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    devStore.remove('event_division_members', target.id!)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /portal/api/events/[id]/divisions/[divisionId]/members error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}