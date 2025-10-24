// app/auth/callback/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Where to go after we set the session cookies
  const raw = url.searchParams.get('redirect') || '/portal/dashboard';
  const next = sanitizeRedirect(raw);

  // If Supabase sent us a code, exchange it for a session (sets sb-* cookies)
  const code = url.searchParams.get('code');
  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // If the code is invalid/expired, punt back to login with a message
        return NextResponse.redirect(
          new URL(`/portal/login?e=${encodeURIComponent(error.message)}`, url.origin)
        );
      }
    } catch {
      return NextResponse.redirect(
        new URL(`/portal/login?e=${encodeURIComponent('auth-callback-failed')}`, url.origin)
      );
    }
  }

  // Whether or not there was a code, always redirect to the intended place
  return NextResponse.redirect(new URL(next, url.origin));
}

function sanitizeRedirect(v: string) {
  // Decode once (guards against %252F cases) and pin to /portal or other internal paths
  let dec = v;
  try { dec = decodeURIComponent(v); } catch {}
  // Only allow internal paths; default to dashboard
  if (!dec.startsWith('/')) return '/portal/dashboard';
  // Optional: keep /portal paths or allow other known-safe paths like /whoami
  return dec;
}