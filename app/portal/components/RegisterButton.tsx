'use client'
import { useState } from 'react'

export default function RegisterButton({ eventId, userId }: { eventId: string; userId: string }) {
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/portal/api/events/${eventId}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
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
      // fetch user registrations first to find the one to cancel
      const regs = await fetch(`/portal/api/events/${eventId}/registrations`)
      const all = await regs.json()
      const match = all.find((r: any) => r.userId === userId)
      if (!match) throw new Error('No registration found')
      await fetch(`/portal/api/registrations/${match.id}`, { method: 'DELETE' })
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