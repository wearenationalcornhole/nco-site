import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const url = new URL(req.url)

  const raw = url.searchParams.get('redirect') || '/portal/dashboard'
  const decoded = safeDecode(raw)
  const next = decoded.startsWith('/portal') ? decoded : '/portal/dashboard'

  const code = url.searchParams.get('code')
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/portal/login?e=' + encodeURIComponent(error.message), url.origin))
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
function safeDecode(v: string) { try { return decodeURIComponent(v) } catch { return v } }