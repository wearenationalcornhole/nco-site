// middleware.ts (root)
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Supabase cookie presence = session heuristic
function hasSupabaseSession(req: NextRequest) {
  const cookies = req.cookies.getAll();
  return cookies.some((c) => c.name.startsWith('sb-') || c.name === 'supabase-auth-token');
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ---- Public demo-gallery: add noindex header (no auth) ----
  if (pathname.startsWith('/demo-gallery')) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // ---- Guard /portal/* with Supabase auth ----
  if (pathname.startsWith('/portal')) {
    // allow login page
    if (pathname === '/portal/login' || pathname.startsWith('/portal/login/')) {
      return NextResponse.next();
    }

    // require session for everything else
    if (!hasSupabaseSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = '/portal/login';
      url.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // everything else untouched
  return NextResponse.next();
}

// ✅ Use explicit matchers; no regex groups here
export const config = {
  matcher: ['/portal/:path*', '/demo-gallery/:path*'],
};