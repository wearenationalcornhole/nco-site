import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function sanitizeRedirect(value: string | null) {
  if (!value || !value.startsWith('/')) return '/portal'
  if (value.startsWith('//')) return '/portal'
  if (value.startsWith('/portal/login')) return '/portal'
  return value
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const nextPath = sanitizeRedirect(url.searchParams.get('redirect'))

  //let response = NextResponse.redirect(new URL(nextPath, url.origin))
  let response = NextResponse.redirect(
  new URL('/portal/login?debug=callback_success', url.origin)
)
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback exchangeCodeForSession error:', error.message)

      return NextResponse.redirect(
        new URL(
          `/portal/login?error=${encodeURIComponent(error.message)}`,
          url.origin,
        ),
      )
    }

    return response
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type:
        type === 'recovery' ||
        type === 'invite' ||
        type === 'email_change'
          ? type
          : 'email',
    })

    if (error) {
      console.error('Auth callback verifyOtp error:', error.message)

      return NextResponse.redirect(
        new URL(
          `/portal/login?error=${encodeURIComponent(error.message)}`,
          url.origin,
        ),
      )
    }

    return response
  }

  return NextResponse.redirect(
    new URL('/portal/login?error=missing_auth_code', url.origin),
  )
}
