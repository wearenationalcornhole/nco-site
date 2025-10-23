import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const url = new URL(req.url)

  // read & sanitize redirect
  const raw = url.searchParams.get('redirect') || '/portal/dashboard'
  const decoded = safeDecode(raw)
  const next = decoded.startsWith('/portal') ? decoded : '/portal/dashboard'

  const code = url.searchParams.get('code')
  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      // Sets sb-* cookies on your domain
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        // If token is invalid/expired, send back to login with message
        return NextResponse.redirect(new URL(`/portal/login?e=${encodeURIComponent(error.message)}`, url.origin))
      }
    } catch {
      return NextResponse.redirect(new URL('/portal/login?e=auth-callback-failed', url.origin))
    }
  }

  // Always redirect to intended destination
  return NextResponse.redirect(new URL(next, url.origin))
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}