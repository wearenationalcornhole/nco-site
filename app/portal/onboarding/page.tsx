'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/portal/login'); return }
      setEmail(user.email ?? null)
    }
    run()
  }, [router])

  const choose = async (role: 'organizer'|'player') => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/portal/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      alert(error.message)
      return
    }
    // Route by role
    router.replace(role === 'organizer' ? '/portal/events' : '/portal/players')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-10">
      <div className="mx-auto max-w-xl bg-white rounded-2xl shadow p-8 text-center">
        <img src="/images/nco-mark.svg" alt="NCO" className="h-14 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-[#0A3161]">Choose your path</h1>
        <p className="text-gray-600 mt-2">
          {email ? `Hi ${email}, ` : null}tell us how you’ll use the portal.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <button
            disabled={saving}
            onClick={() => choose('organizer')}
            className="rounded-xl border p-6 text-left hover:shadow transition bg-white"
          >
            <h2 className="font-semibold text-[#0A3161]">Organizer</h2>
            <p className="text-sm text-gray-600 mt-1">Create events, manage divisions, sponsors, and registrations.</p>
          </button>

          <button
            disabled={saving}
            onClick={() => choose('player')}
            className="rounded-xl border p-6 text-left hover:shadow transition bg-white"
          >
            <h2 className="font-semibold text-[#0A3161]">Player</h2>
            <p className="text-sm text-gray-600 mt-1">Join events, view assignments, submit bag info.</p>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">You can change this later under Profile.</p>
      </div>
    </main>
  )
}