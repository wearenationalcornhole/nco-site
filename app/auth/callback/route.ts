import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('redirect') || '/portal/dashboard'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL(next, url.origin))
  }

  // If there's no code, fall through to the client page to handle hash flow.
  return NextResponse.redirect(new URL(`/auth/callback?redirect=${encodeURIComponent(next)}`, url.origin))
}