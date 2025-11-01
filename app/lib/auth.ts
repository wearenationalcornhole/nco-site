// app/lib/auth.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // READ-ONLY adapters for server components:
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      // noop: don’t write cookies from server components
      set() {},
      remove() {},
    },
  })
}