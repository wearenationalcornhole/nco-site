'use client'
import { useEffect, useMemo, useState } from 'react'

type Company = {
  id: string
  name: string
  website: string | null
  logo: string | null
  logoHash?: string | null
  sponsoredEvents?: number
  createdAt?: string | null
}

export default function OrgSponsorsClient() {
  const [items, setItems] = useState<Company[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWebsite, setNewWebsite] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/portal/api/companies?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // initial

  const filtered = useMemo(() => items, [items])

  async function createCompany() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/portal/api/companies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), website: newWebsite.trim() || undefined }),
    })
    const company = await res.json()
    setCreating(false)
    setShowAdd(false)
    setNewName(''); setNewWebsite('')
    await load()
  }

  async function onUploadLogo(companyId: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/portal/api/companies/${companyId}/logo`, {
      method: 'POST',
      body: fd,
    })
    if (!res.ok) {
      alert('Upload failed')
      return
    }
    await load()
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sponsors</h1>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' ? load() : null)}
            placeholder="Search sponsors…"
            className="rounded border px-3 py-2"
          />
          <button onClick={load} className="rounded bg-black text-white px-4 py-2">Search</button>
          <button onClick={() => setShowAdd(true)} className="rounded bg-blue-600 text-white px-4 py-2">Add Sponsor</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-600">No sponsors yet.</p>
        ) : filtered.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-4">
            <div className="h-24 flex items-center justify-center border rounded mb-3 bg-gray-50 overflow-hidden">
              {c.logo ? (
                <img src={c.logo} alt={c.name} className="max-h-24 object-contain" />
              ) : (
                <span className="text-gray-400 text-sm">No logo</span>
              )}
            </div>
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-gray-600 truncate">{c.website ?? '—'}</div>
            <div className="mt-3 flex items-center justify-between">
              <label className="text-sm">
                <span className="mr-2">Upload logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onUploadLogo(c.id, f)
                  }}
                />
                <span className="rounded border px-2 py-1 cursor-pointer">Choose</span>
              </label>
              <span className="text-xs text-gray-500">{c.sponsoredEvents ?? 0} events</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Sponsor Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-lg font-semibold">Add Sponsor</h2>
            <div className="mt-4 space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Sponsor name"
                className="w-full rounded border px-3 py-2"
              />
              <input
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                placeholder="Website (optional)"
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded border px-4 py-2">Cancel</button>
              <button onClick={createCompany} disabled={creating || !newName.trim()} className="rounded bg-blue-600 text-white px-4 py-2">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}