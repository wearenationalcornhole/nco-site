// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only touch /demo-gallery: add noindex header
  if (pathname.startsWith('/demo-gallery')) {
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  // Everything else (including /portal) → untouched
  return NextResponse.next()
}

export const config = {
  matcher: ['/demo-gallery/:path*'],
}