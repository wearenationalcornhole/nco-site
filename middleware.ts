import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  if (pathname.startsWith('/portal')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              req.cookies.set(name, value)
            }

            res = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })

            for (const { name, value, options } of cookiesToSet) {
              res.cookies.set(name, value, options)
            }
          },
        },
      })

      await supabase.auth.getUser().catch(() => null)
    }
  }

  if (pathname.startsWith('/demo-gallery') || pathname.startsWith('/portal')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  return res
}

export const config = {
  matcher: ['/demo-gallery/:path*', '/portal/:path*'],
}
