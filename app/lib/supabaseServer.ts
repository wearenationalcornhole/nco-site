// app/lib/supabaseServer.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Session } from '@supabase/supabase-js'

/**
 * In some Next versions/configs, cookies() is async (returns a Promise).
 * We await it here and then provide synchronous get/set/remove to Supabase.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies() // <-- await for environments where it's async

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
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('supabase.getSession error:', error.message)
    return null
  }
  return data.session ?? null
}