'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Role = 'organizer' | 'player' | null

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient() // ← helpers client
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/portal/login'); return }

      setEmail(user.email ?? null)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        router.replace('/portal/onboarding'); return
      }

      const r = (profile?.role as Role) ?? null
      if (!r) { router.replace('/portal/onboarding'); return }

      setRole(r)
      setLoading(false)
    }
    run()
  }, [router, supabase])

  /* …rest of your component unchanged… */
}