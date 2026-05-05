// app/portal/api/webhooks/production/route.ts
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    // For now, just log it. In the future, forward to BlueHost, Zapier, Make, etc.
    console.log('🧵 Production webhook received:', payload)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('webhook error', e)
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }
}