'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const sp = useSearchParams()
  const to = sp.get('redirect') || '/portal'

  useEffect(() => {
    const go = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        console.error('Auth exchange error:', error)
        router.replace(`/portal/login?e=${encodeURIComponent(error.message)}`)
        return
      }
      router.replace(to)
    }
    go()
  }, [router, to])

  return <main className="min-h-screen grid place-items-center"><p>Signing you in…</p></main>
}