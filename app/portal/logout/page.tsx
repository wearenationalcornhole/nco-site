// app/portal/logout/page.tsx
'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.signOut().finally(() => router.push('/'))
  }, [supabase, router])

  return <p className="text-center mt-20 text-gray-600">Signing out…</p>
}