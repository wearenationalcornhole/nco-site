// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Helper: does the request have a Supabase session cookie?
function hasSupabaseSession(req: NextRequest) {
  // Supabase auth cookies look like: sb-<project-ref>-auth-token, sb-...-auth-token.0/1
  const cookies = req.cookies.getAll()
  return cookies.some((c) => c.name.startsWith('sb-') || c.name === 'supabase-auth-token')
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const method = req.method

  // Only guard /portal/* routes
  if (!pathname.startsWith('/portal')) {
    return NextResponse.next()
  }

  // Always allow non-mutating preflight/headers checks
  if (method === 'HEAD' || method === 'OPTIONS') {
    return NextResponse.next()
  }

  // PUBLIC routes (no auth required)
  const isPortalLogin = pathname === '/portal/login' || pathname.startsWith('/portal/login/')
  const isDemoIndex = pathname === '/portal/demo-bags'
  const isDemoChild = pathname.startsWith('/portal/demo-bags/')
  if (isPortalLogin || isDemoIndex || isDemoChild) {
    // Add noindex on demo pages so shared links aren’t indexed
    if (isDemoIndex || isDemoChild) {
      const res = NextResponse.next()
      res.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return res
    }
    return NextResponse.next()
  }

  // Everything else under /portal requires Supabase session
  if (!hasSupabaseSession(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/portal/login'
    url.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(url)
  }

  // Authenticated → allow
  return NextResponse.next()
}

// Run only for /portal/*
export const config = {
  matcher: ['/portal/:path*'],
}