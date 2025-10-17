export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

const ALLOWED = new Set(['Pending', 'Approved', 'Rejected'])
const PRODUCTION_WEBHOOK_URL = process.env.PRODUCTION_WEBHOOK_URL || '/internal-webhook'

async function triggerWebhook(bag: { id: string; status: string }) {
  try {
    const url = PRODUCTION_WEBHOOK_URL.startsWith('http')
      ? PRODUCTION_WEBHOOK_URL
      : `${process.env.BASE_URL || ''}${PRODUCTION_WEBHOOK_URL}`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'BAG_APPROVED',
        bag: { id: bag.id, status: bag.status },
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.error('Webhook trigger error:', e)
  }
}

export async function PATCH(req: Request, context: any) {
  const id = context?.params?.id as string
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { status } = await req.json()
    if (!status || !ALLOWED.has(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const updated = await prisma.event_bag_submissions.update({
        where: { id },
        data: { status },
      })
      if (status === 'Approved') {
        await triggerWebhook(updated)
      }
      return NextResponse.json(updated)
    }

    const existing = devStore.getById<any>('event_bag_submissions', id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = devStore.upsert('event_bag_submissions', { ...existing, status })
    if (status === 'Approved') {
      await triggerWebhook(updated)
    }
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PATCH /portal/api/bags/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
