import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('redirect') || '/portal/dashboard'

  if (code) {
    // This will set the sb- auth cookies on your domain
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Always redirect to your intended destination
  return NextResponse.redirect(new URL(next, url.origin))
}