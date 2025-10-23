import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith('/portal')) return;

  // allow the login route itself
  if (path === '/portal/login' || path.startsWith('/portal/login/')) return;

  const hasSession = req.cookies.getAll().some(c => c.name.startsWith('sb-'));
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/portal/login';
    url.searchParams.set('redirect', path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
}
export const config = { matcher: ['/portal/:path*'] };