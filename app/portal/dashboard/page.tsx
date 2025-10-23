'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabaseClient'

type Role = 'organizer' | 'player' | null

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    const run = async () => {
      // 1) Must have a user (middleware should enforce, but double-check client-side)
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) {
        router.replace('/portal/login')
        return
      }
      setEmail(user.email ?? null)

      // 2) Fetch profile role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        // If profile row doesn’t exist yet, you can create it here client-side if desired.
        // For now, treat as no role.
        setRole(null)
        setLoading(false)
        router.replace('/portal/onboarding')
        return
      }

      const r = (profile?.role as Role) ?? null
      setRole(r)
      setLoading(false)

      // 3) First-time users without role → onboarding
      if (!r) {
        router.replace('/portal/onboarding')
      }
    }

    run()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
        <div className="text-center">
          <img src="/images/nco-mark.svg" alt="NCO" className="h-14 mx-auto mb-4" />
          <p className="text-gray-700">Loading your dashboard…</p>
        </div>
      </main>
    )
  }

  // If role was missing, we already redirected to onboarding. Rendering below assumes role exists.
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
      <header className="text-center mb-10">
        <img src="/images/nco-mark.svg" alt="National Cornhole Logo" className="mx-auto mb-4 h-16" />
        <h1 className="text-3xl font-semibold text-[#0A3161]">National Cornhole Portal</h1>
        <p className="mt-2 text-gray-600">
          Welcome{email ? `, ${email}` : ''}! <span className="ml-2 inline-block rounded-full bg-[#0A3161]/10 px-3 py-0.5 text-sm text-[#0A3161]">
            {role === 'organizer' ? 'Organizer' : 'Player'}
          </span>
        </p>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {/* Common: Demo Bags */}
        <Card
          title="Demo Bags"
          desc="View and share event bag mockups."
          cta="Open gallery"
          href="/portal/demo-bags"
          color="#B31942"
        />

        {role === 'organizer' ? (
          <>
            <Card
              title="My Events"
              desc="Create and manage tournaments, divisions, and sponsors."
              cta="Go to events"
              href="/portal/events"
              color="#0A3161"
            />
            <Card
              title="Players & Assignments"
              desc="Assign divisions, manage waitlists, and promote from queue."
              cta="Manage players"
              href="/portal/players"
              color="#0A3161"
            />
          </>
        ) : (
          <>
            <Card
              title="Find & Join Events"
              desc="Browse upcoming tournaments and register to play."
              cta="Browse events"
              href="/portal/events"
              color="#0A3161"
            />
            <Card
              title="My Registrations"
              desc="See your divisions, statuses, and bag submissions."
              cta="View registrations"
              href="/portal/players"
              color="#0A3161"
            />
          </>
        )}
      </section>

      <div className="mt-10 text-center">
        <button
          onClick={signOut}
          className="text-sm text-gray-600 hover:text-[#B31942] underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}

function Card({
  title,
  desc,
  cta,
  href,
  color,
}: {
  title: string
  desc: string
  cta: string
  href: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl bg-white p-6 shadow ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <h2 className="text-xl font-semibold mb-1" style={{ color }}>{title}</h2>
      <p className="text-gray-600 mb-4">{desc}</p>
      <span
        className="inline-flex items-center font-medium text-white px-4 py-2 rounded"
        style={{ backgroundColor: color }}
      >
        {cta}
        <svg
          className="ml-2 h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 11-1.414-1.414L14.586 12H5a1 1 0 110-2h9.586l-2.293-2.293a1 1 0 010-1.414z" />
        </svg>
      </span>
    </Link>
  )
}