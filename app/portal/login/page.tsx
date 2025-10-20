// app/portal/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${location.origin}/portal/org`, // after login
        },
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] grid place-content-center px-4">
      <div className="w-[92vw] max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          Use your email and we’ll send a one-time sign-in link.
        </p>

        {sent ? (
          <div className="mt-4 rounded-lg bg-brand/5 border border-brand/20 p-3 text-sm text-brand">
            We sent a sign-in link to <span className="font-medium">{email}</span>. Check your inbox!
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {error && <div className="text-sm text-danger">{error}</div>}
            <Button loading={loading} className="w-full">Send magic link</Button>
          </form>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <Link href="/portal" className="text-usaBlue hover:underline">Back to portal</Link>
        </div>
      </div>
    </div>
  )
}