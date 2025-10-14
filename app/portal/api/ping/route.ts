export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, where: 'api/ping' }, { status: 200 })
}