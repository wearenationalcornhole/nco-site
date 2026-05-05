// app/demo-gallery/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Block indexing bots on demo-gallery routes
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = {
  matcher: ['/demo-gallery/:path*'],
};