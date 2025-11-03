// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function hasSupabaseSession(req: NextRequest) {
  const names = req.cookies.getAll().map(c => c.name);

  // Current cookie names (Supabase v2)
  if (names.includes('sb-access-token') || names.includes('sb-refresh-token')) return true;

  // Legacy chunked names: sb-<project-ref>-auth-token or sb-<project-ref>-auth-token.0
  if (names.some(n => /^sb-[\w-]+-auth-token(\.\d+)?$/.test(n))) return true;

  // Very old single cookie
  if (names.includes('supabase-auth-token')) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip static/internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml')
  ) {
    return NextResponse.next();
  }

  // Public demo-gallery: add noindex
  if (pathname.startsWith('/demo-gallery')) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // Always allow auth callbacks
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // 🔧 TEMP BYPASS: let /portal/events* through (the page enforces auth itself)
  if (pathname === '/portal/events' || pathname.startsWith('/portal/events/')) {
    return NextResponse.next();
  }

  // Guard everything else under /portal
  if (pathname.startsWith('/portal')) {
    // allow login
    if (pathname === '/portal/login' || pathname.startsWith('/portal/login/')) {
      return NextResponse.next();
    }

    if (!hasSupabaseSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = '/portal/login';
      url.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/:path*',
    '/demo-gallery/:path*',
    '/auth/:path*',
  ],
};