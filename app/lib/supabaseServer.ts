// app/lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ServerSupabase = SupabaseClient

export function getSupabaseServer(): ServerSupabase {
  const cookieStore = cookies()

  // NOTE: createServerClient handles reading/writing the auth cookies for SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const c = cookieStore.get(name)
          return c?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Next 15: headers() cookies are immutable at runtime in RSC;
          // createServerClient gracefully no-ops set() on server.
        },
        remove(name: string, options: CookieOptions) {
          // no-op on server
        },
      },
    }
  )

  return supabase
}

export async function getSession() {
  const supabase = getSupabaseServer()
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

export async function getUser() {
  const supabase = getSupabaseServer()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}