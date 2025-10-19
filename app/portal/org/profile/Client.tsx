'use client'

import { useEffect, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'

type OrgProfile = {
  user: {
    id: string
    email: string
    name: string | null
    city: string | null
    state: string | null
    profile_image: string | null
  }
  club: {
    id: string
    name: string
    city: string | null
    state: string | null
    logo_url: string | null
    website: string | null
  } | null
}

export default function Client() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [data, setData] = useState<OrgProfile | null>(null)

  // editable form state
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [stateVal, setStateVal] = useState('')
  const [clubName, setClubName] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [clubState, setClubState] = useState('')
  const [clubWebsite, setClubWebsite] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/portal/api/org/profile', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load organizer profile')
        const json: OrgProfile = await res.json()
        if (!alive) return
        setData(json)

        // seed form
        setName(json.user.name ?? '')
        setCity(json.user.city ?? '')
        setStateVal(json.user.state ?? '')
        setClubName(json.club?.name ?? '')
        setClubCity(json.club?.city ?? '')
        setClubState(json.club?.state ?? '')
        setClubWebsite(json.club?.website ?? '')
      } catch (e: any) {
        if (!alive) return
        setToast({ msg: e?.message ?? 'Load error', kind: 'error' })
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  async function saveUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/portal/api/org/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveUser',
          user: { name, city, state: stateVal },
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')
      const updated: OrgProfile = await res.json()
      setData(updated)
      setToast({ msg: 'Profile saved', kind: 'success' })
    } catch (e: any) {
      setToast({ msg: e?.message ?? 'Save failed', kind: 'error' })
    }
  }

  async function saveClub(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/portal/api/org/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveClub',
          club: { name: clubName, city: clubCity, state: clubState, website: clubWebsite },
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')
      const updated: OrgProfile = await res.json()
      setData(updated)
      setToast({ msg: 'Club saved', kind: 'success' })
    } catch (e: any) {
      setToast({ msg: e?.message ?? 'Save failed', kind: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="h-48 grid place-content-center text-gray-600">
        <div className="flex items-center gap-2"><Spinner /> Loading…</div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-gray-600">No profile data</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Organizer Profile</h1>
      <p className="text-gray-600 mt-1">Manage your profile and club.</p>

      {/* User */}
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Your Info</h2>
        <dl className="mt-3 text-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="text-gray-500">Email</dt><dd className="font-medium">{data.user.email}</dd></div>
          <div><dt className="text-gray-500">User ID</dt><dd className="font-medium break-all">{data.user.id}</dd></div>
        </dl>

        <form onSubmit={saveUser} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Name"
            value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="City"
            value={city} onChange={(e)=>setCity(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="State"
            value={stateVal} onChange={(e)=>setStateVal(e.target.value)} />
          <div className="sm:col-span-3">
            <button className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90">Save Profile</button>
          </div>
        </form>
      </section>

      {/* Club */}
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Club</h2>
        {data.club ? (
          <p className="text-sm text-gray-600 mt-1">You are linked to <span className="font-medium">{data.club.name}</span>.</p>
        ) : (
          <p className="text-sm text-gray-600 mt-1">No club yet—create one below.</p>
        )}

        <form onSubmit={saveClub} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Club name *" required
            value={clubName} onChange={(e)=>setClubName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Website"
            value={clubWebsite} onChange={(e)=>setClubWebsite(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="City"
            value={clubCity} onChange={(e)=>setClubCity(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="State"
            value={clubState} onChange={(e)=>setClubState(e.target.value)} />
          <div className="sm:col-span-2">
            <button className="rounded bg-black text-white px-3 py-2 text-sm hover:opacity-90">
              {data.club ? 'Save Club' : 'Create Club'}
            </button>
          </div>
        </form>
      </section>

      {toast && (
        <Toast
          key={toast.msg}
          message={toast.msg}
          kind={toast.kind}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}