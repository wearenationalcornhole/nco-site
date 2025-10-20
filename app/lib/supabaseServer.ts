// app/lib/supabaseServer.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Session } from '@supabase/supabase-js'

export function createSupabaseServerClient() {
  // Next 15+: cookies() is synchronous
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const c = cookieStore.get(name)
          return c?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // ignore if headers already sent
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // ignore if headers already sent
          }
        },
      },
    }
  )
}

/**
 * Server helper to fetch the current Supabase session.
 * Returns `null` if not signed in.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    // Optional: log but don't throw, we just treat it as no session
    console.error('supabase.getSession error:', error.message)
    return null
  }
  return data.session ?? null
}