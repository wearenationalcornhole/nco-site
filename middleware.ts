import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Only guard /portal/* routes
  if (!pathname.startsWith('/portal')) return

  // Always allow the login route
  if (pathname === '/portal/login' || pathname.startsWith('/portal/login/')) return

  // PUBLIC: demo bag gallery + its subpages
  if (pathname === '/portal/demo-bags' || pathname.startsWith('/portal/demo-bags/')) return

  // Everything else under /portal requires Supabase session
  const hasSession = req.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  if (!hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/portal/login'
    url.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(url)
  }

  // Authenticated user — allow
  return
}

// Run only for /portal/*
export const config = {
  matcher: ['/portal/:path*'],
}