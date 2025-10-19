'use client'

import { useEffect, useState } from 'react'

type User = {
  id?: string
  email: string
  name?: string | null
  city?: string | null
  state?: string | null
  profile_image?: string | null
  role?: string | null
}

type Club = {
  id: string
  name: string
  city?: string | null
  state?: string | null
  logo_url?: string | null
  website?: string | null
}

export default function Client() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [club, setClub] = useState<Club | null>(null)

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [clubName, setClubName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch('/portal/api/org/profile', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((data) => {
        if (!alive) return
        setUser(data.user ?? null)
        setClub(data.club ?? null)
        setName(data.user?.name ?? '')
        setCity(data.user?.city ?? '')
        setState(data.user?.state ?? '')
        setClubName(data.club?.name ?? '')
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/portal/api/org/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || null,
          city: city || null,
          state: state || null,
          clubName: clubName || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')
      const data = await res.json()
      setUser(data.user ?? null)
      setClub(data.club ?? null)
      setMsg('Saved!')
    } catch (err: any) {
      setMsg(err?.message ?? 'Error saving profile')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 1800)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Organizer Profile</h1>
      <p className="mt-1 text-gray-600">Update your organizer info and optional club.</p>

      <div className="mt-6 rounded-xl border bg-white p-6">
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-700">Email (read-only)</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm bg-gray-50"
                value={user?.email ?? ''}
                readOnly
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Name</label>
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                     value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-gray-700">State</label>
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                     value={state} onChange={(e) => setState(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-gray-700">City</label>
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                     value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-gray-700">Club (optional)</label>
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                     placeholder="Your club name" value={clubName}
                     onChange={(e) => setClubName(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <button
                disabled={saving}
                className="rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {msg && <span className="ml-3 text-sm text-gray-700">{msg}</span>}
            </div>

            {club && (
              <div className="sm:col-span-2 mt-4 rounded border p-4 bg-gray-50">
                <div className="text-sm text-gray-700">Linked Club</div>
                <div className="mt-1 font-medium">{club.name}</div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}