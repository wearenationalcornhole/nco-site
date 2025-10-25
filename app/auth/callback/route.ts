// app/auth/callback/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('redirect') || '/portal';

  const supabase = createRouteHandlerClient({ cookies });

  // Exchange PKCE code for a session; this sets sb- cookies on YOUR domain
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to intended destination
  return NextResponse.redirect(new URL(next, url.origin));
}