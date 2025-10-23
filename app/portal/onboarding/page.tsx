'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient() // ← helpers client
  const [email, setEmail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/portal/login'); return }
      setEmail(user.email ?? null)
    }
    run()
  }, [router, supabase])

  const choose = async (role: 'organizer'|'player') => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/portal/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)

    setSaving(false)
    if (error) { alert(error.message); return }

    router.replace(role === 'organizer' ? '/portal/events' : '/portal/players')
  }

  /* …rest of your component unchanged… */
}