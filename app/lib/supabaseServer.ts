// app/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Read-only Supabase server client for server components/pages.
 * - Only implements cookies.get
 * - set/remove are NO-OP to avoid Next.js “cookies can only be modified…” errors
 * Use route handlers (e.g., app/auth/callback/route.ts) for auth writes.
 */
export async function getSupabaseServer(): Promise<SupabaseClient> {
  // In your setup, cookies() is async → await it
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // No-ops so server components never attempt cookie writes
      set() {},
      remove() {},
    },
  });
}