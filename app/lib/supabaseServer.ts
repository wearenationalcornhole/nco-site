// app/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Read-only Supabase server client for server components/pages.
 * - Only implements cookies.get
 * - set/remove are NO-OP to avoid Next.js “cookies can only be modified…” errors
 * Use route handlers like /app/auth/callback/route.ts for login/exchange/logout where writes are allowed.
 */
export async function getSupabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies(); // read-only access is fine in server components

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // NO-OPs to keep Next.js happy outside of route handlers
      set() {},
      remove() {},
    },
  });
}