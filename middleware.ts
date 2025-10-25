// middleware.ts (root)
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function hasSupabaseSession(req: NextRequest) {
  const cookies = req.cookies.getAll();
  return cookies.some((c) => c.name.startsWith('sb-') || c.name === 'supabase-auth-token');
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Add noindex header for public demo-gallery
  if (pathname.startsWith('/demo-gallery')) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // Guard /portal/*
  if (!pathname.startsWith('/portal')) return NextResponse.next();

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

export const config = {
  matcher: ['/(?:portal|demo-gallery)(?:/.*)?'],
};