export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

function buildGoneResponse() {
  return NextResponse.json(
    {
      error: 'Organizer personal profile endpoints were removed. Use /portal/profile for shared member identity fields.',
      redirectTo: '/portal/profile',
    },
    { status: 410 },
  )
}

export async function GET() {
  return buildGoneResponse()
}

export async function PUT() {
  return buildGoneResponse()
}
