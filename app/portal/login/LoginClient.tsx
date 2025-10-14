// app/portal/login/LoginClient.tsx
'use client'

import { useAuth } from '@/app/lib/devAuth'
import Link from 'next/link'

export default function LoginClient() {
  const { user, loginAs, logout } = useAuth()

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Sign in (Dev Mode)</h1>

      {!user ? (
        <div className="grid gap-3">
          <button className="border rounded px-3 py-2" onClick={() => loginAs('PLAYER')}>
            Continue as Player
          </button>
          <button className="border rounded px-3 py-2" onClick={() => loginAs('ORGANIZER')}>
            Continue as Organizer
          </button>
          <button className="border rounded px-3 py-2" onClick={() => loginAs('ADMIN')}>
            Continue as Admin
          </button>
          <p className="text-sm text-gray-600 mt-4">
            This is a temporary dev login. Real auth (magic link) comes when we wire Supabase/NextAuth.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-3">
            Signed in as <strong>{user.name}</strong> ({user.role})
          </p>
          <div className="flex gap-2">
            <Link href="/portal" className="rounded-full bg-black text-white px-4 py-2">
              Continue to Portal
            </Link>
            <button onClick={logout} className="rounded-full border px-4 py-2">
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}