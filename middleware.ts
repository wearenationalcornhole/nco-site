// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Keep private/demo surfaces out of search indices.
  if (pathname.startsWith('/demo-gallery') || pathname.startsWith('/portal')) {
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  // Everything else (including /portal) → untouched
  return NextResponse.next()
}

export const config = {
  matcher: ['/demo-gallery/:path*', '/portal/:path*'],
}
