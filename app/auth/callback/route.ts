// app/auth/callback/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('redirect') || '/portal';

  const supabase = createRouteHandlerClient({ cookies });

  // Server-side exchange: this sets the sb- cookies on your domain
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Even if there's no code (rare), just send them on; session may already exist
  return NextResponse.redirect(new URL(next, url.origin));
}