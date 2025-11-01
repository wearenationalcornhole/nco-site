// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function hasSupabaseSession(req: NextRequest) {
  // Supabase v2 sets sb-xxx cookies; older libs may use supabase-auth-token
  return req.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-') || c.name === 'supabase-auth-token');
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 0) Skip static and Next internals ASAP
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

  // 1) Public demo-gallery: add noindex header
  if (pathname.startsWith('/demo-gallery')) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // 2) Do NOT touch auth callback routes
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // 3) Guard /portal/*
  if (pathname.startsWith('/portal')) {
    // allow login itself
    if (pathname === '/portal/login' || pathname.startsWith('/portal/login/')) {
      return NextResponse.next();
    }

    // require session
    if (!hasSupabaseSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = '/portal/login';
      url.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // 4) Everything else untouched
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/:path*',
    '/demo-gallery/:path*',
    '/auth/:path*', // included so we can *allow* it (no redirects)
  ],
};