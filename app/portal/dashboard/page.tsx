'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import Link from 'next/link'

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserEmail(data?.user?.email ?? null)
    }
    getUser()
  }, [])

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-10">
      <header className="text-center mb-10">
        <img
          src="/images/nco-mark.webp"
          alt="National Cornhole Logo"
          className="mx-auto mb-4 h-20"
        />
        <h1 className="text-3xl font-semibold text-[#0A3161]">
          National Cornhole Portal
        </h1>
      </header>

      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0A3161] mb-4">
          Welcome {userEmail ? userEmail : 'Player'}
        </h2>
        <p className="text-gray-700 mb-8">
          You’ve successfully logged in to the National Cornhole Portal.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/portal/events"
            className="bg-[#0A3161] text-white px-5 py-2 rounded hover:bg-[#08264c] transition"
          >
            View My Events
          </Link>
          <Link
            href="/portal/demo-bags"
            className="bg-[#B31942] text-white px-5 py-2 rounded hover:bg-[#911633] transition"
          >
            Demo Bags
          </Link>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/portal/login'
          }}
          className="mt-8 text-sm text-gray-500 hover:text-[#B31942]"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}