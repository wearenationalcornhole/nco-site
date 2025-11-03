// app/lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'

/**
 * Read-only Supabase server client for server components/pages.
 * - Only implements cookies.get
 * - set/remove are NO-OP to avoid Next.js "cookies can only be modified..." errors
 * Use route handlers (/app/**/route.ts) for login/exchange/logout where writes are allowed.
 */
export function getSupabaseServer(): SupabaseClient {
  // NOTE: cookies() is fine to call here; we only read.
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // No-ops so server components never attempt to mutate cookies
        set() {},
        remove() {},
      },
    }
  )
}