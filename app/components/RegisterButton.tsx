'use client'

import { useState } from 'react'

export default function RegisterButton({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string>('')

  // TEMP: demo user until real auth is wired
  const demoUserId = 'demo-user-1'

  async function handleRegister() {
    setStatus('loading'); setMsg('')
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: demoUserId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to register')
      setStatus('done'); setMsg('You are registered!')
    } catch (e: any) {
      setStatus('error'); setMsg(e?.message ?? 'Error')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={status === 'loading' || status === 'done'}
        onClick={handleRegister}
        className="rounded-full bg-usaRed px-5 py-2 font-semibold text-white hover:bg-[#8F1732] disabled:opacity-60"
      >
        {status === 'loading' ? 'Registering…' : status === 'done' ? 'Registered' : 'Register'}
      </button>
      {msg && (
        <span className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>
      )}
    </div>
  )
}