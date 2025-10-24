'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Role = 'organizer' | 'player'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [email, setEmail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Must be logged in
        const { data: { user }, error: uerr } = await supabase.auth.getUser()
        if (uerr) throw uerr
        if (!user) { router.replace('/portal/login'); return }
        setEmail(user.email ?? null)

        // 2) If role already set, skip onboarding
        const { data: profile, error: perr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (perr) throw perr
        if (profile?.role) {
          router.replace(profile.role === 'organizer' ? '/portal/events' : '/portal/players')
          return
        }

        setLoading(false)
      } catch (e: any) {
        console.error('onboarding init error:', e)
        setErr(e?.message || 'Failed to load onboarding')
        setLoading(false)
      }
    }
    run()
  }, [router, supabase])

  const choose = async (role: Role) => {
    try {
      setSaving(true)
      const { data: { user }, error: uerr } = await supabase.auth.getUser()
      if (uerr) throw uerr
      if (!user) { router.replace('/portal/login'); return }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id)

      if (error) throw error

      router.replace(role === 'organizer' ? '/portal/events' : '/portal/players')
    } catch (e: any) {
      console.error('onboarding save error:', e)
      setErr(e?.message || 'Could not save your choice')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-10">
        <p>Loading onboarding…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-10">
      <div className="mx-auto max-w-xl bg-white rounded-2xl shadow p-8 text-center">
        <img src="/images/nco-logo.png" alt="NCO" className="h-14 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-[#0A3161]">Choose your path</h1>
        <p className="text-gray-600 mt-2">
          {email ? `Hi ${email}, ` : ''}tell us how you’ll use the portal.
        </p>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <button
            disabled={saving}
            onClick={() => choose('organizer')}
            className="rounded-2xl border p-6 text-left hover:shadow transition bg-white"
          >
            <h2 className="font-semibold text-[#0A3161]">Organizer</h2>
            <p className="text-sm text-gray-600 mt-1">Create events, manage divisions, sponsors, and registrations.</p>
          </button>

          <button
            disabled={saving}
            onClick={() => choose('player')}
            className="rounded-2xl border p-6 text-left hover:shadow transition bg-white"
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