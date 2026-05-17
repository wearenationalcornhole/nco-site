'use client'
import { useState } from 'react'
import { getSupabaseBrowser } from '@/app/lib/supabaseBrowser'

export default function RegisterButton({ eventId, userId }: { eventId: string; userId: string }) {
  const [supabase] = useState(() => getSupabaseBrowser())
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/portal/api/events/${eventId}/register`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to register')
      setRegistered(true)
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    try {
      setLoading(true)
      setError(null)
      const { data: match, error: matchError } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle<{ id: string }>()

      if (matchError) throw matchError
      if (!match) throw new Error('No registration found')
      const res = await fetch(`/portal/api/registrations/${match.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to cancel registration')
      setRegistered(false)
    } catch (e: any) {
      setError(e?.message ?? 'Cancel failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center">
      {registered ? (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="rounded-full bg-gray-300 text-gray-800 px-6 py-3 font-semibold hover:bg-gray-400 transition disabled:opacity-60"
        >
          {loading ? 'Canceling...' : 'Cancel Registration'}
        </button>
      ) : (
        <button
          onClick={handleRegister}
          disabled={loading}
          className="rounded-full bg-usaRed text-white px-6 py-3 font-semibold hover:bg-[#8F1732] transition disabled:opacity-60"
        >
          {loading ? 'Registering...' : 'Register for Event'}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}
