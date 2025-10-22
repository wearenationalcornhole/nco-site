'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabaseClient'

// Prevent static prerendering; this page should only run client-side
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      // Read redirect from window URL (no useSearchParams needed)
      const url = new URL(window.location.href)
      const to = url.searchParams.get('redirect') || '/portal'

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        console.error('exchange error', error)
        router.replace(`/portal/login?e=${encodeURIComponent(error.message)}`)
        return
      }
      router.replace(to)
    }
    run()
  }, [router])

  return (
    <main className="min-h-screen grid place-items-center">
      <p>Signing you in…</p>
    </main>
  )
}