// app/lib/supabaseServer.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSupabaseServer() {
  const cookieStore = await cookies() // Next 15: async

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // READ-ONLY: we allow reads so Supabase can find your auth cookies
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // NO-OPs on server pages: only Route Handlers / Server Actions may modify cookies
        set() { /* intentionally empty */ },
        remove() { /* intentionally empty */ },
      },
    }
  )

  return supabase
}