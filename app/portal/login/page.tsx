'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!email.trim()) {
      setMessage('Please enter your email.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${location.origin}/portal`,
        },
      })
      if (error) throw error
      setMessage('Check your email for the magic login link!')
    } catch (err: any) {
      setMessage(err?.message ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A3161] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/nco-mark.png"
            alt="National Cornhole Organization Logo"
            className="h-20 w-auto"
          />
        </div>

        <h1 className="text-2xl font-semibold text-center text-[#0A3161]">
          National Cornhole Portal Login
        </h1>
        <p className="text-center text-sm text-gray-600 mt-1">
          Sign in via magic link sent to your email.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A3161]"
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A3161] text-white hover:opacity-90"
          >
            {loading ? 'Sending link…' : 'Send Magic Link'}
          </Button>

          {message && (
            <p
              className={`text-center text-sm ${
                message.includes('Check your email')
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} National Cornhole Organization
          </p>
        </div>
      </div>
    </main>
  )
}