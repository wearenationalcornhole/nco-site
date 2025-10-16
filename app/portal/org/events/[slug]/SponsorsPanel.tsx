'use client'
import { useEffect, useState } from 'react'

type Company = { id: string; name: string; website?: string | null }
type Link = { id: string; event_id: string; company_id: string; tier?: string | null; company?: { id: string; name: string; logo?: string | null } }

export default function SponsorsPanel({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [links, setLinks] = useState<Link[]>([])
  const [options, setOptions] = useState<Company[]>([])
  const [selected, setSelected] = useState<string>('')

  async function loadLinks() {
    const res = await fetch(`/portal/api/event-sponsors?eventId=${encodeURIComponent(eventId)}`)
    setLinks(await res.json())
  }

  async function searchCompanies(q: string) {
    const res = await fetch(`/portal/api/companies?q=${encodeURIComponent(q)}&limit=10`)
    const data = await res.json()
    setOptions(data.items ?? [])
  }

  async function addLink() {
    if (!selected) return
    setLoading(true)
    await fetch('/portal/api/event-sponsors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId, companyId: selected }),
    })
    setSelected('')
    await loadLinks()
    setLoading(false)
  }

  async function removeLink(id: string) {
    setLoading(true)
    await fetch(`/portal/api/event-sponsors/${id}`, { method: 'DELETE' })
    await loadLinks()
    setLoading(false)
  }

  useEffect(() => { loadLinks() }, [eventId])
  useEffect(() => {
    const t = setTimeout(() => searchCompanies(query), 300)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Sponsors</h2>

      {/* Add section */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          className="rounded border px-3 py-2"
        />
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">Select sponsor…</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button disabled={!selected || loading} onClick={addLink} className="rounded bg-blue-600 text-white px-4 py-2">
          {loading ? 'Saving…' : 'Add'}
        </button>
      </div>

      {/* Current sponsors */}
      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.length === 0 ? (
          <li className="text-gray-500">No sponsors linked yet.</li>
        ) : links.map((l) => (
          <li key={l.id} className="flex items-center gap-3 rounded border p-3">
            <div className="h-10 w-10 grid place-items-center rounded bg-gray-50 overflow-hidden">
              {l.company?.logo ? <img src={l.company.logo} alt={l.company.name} className="max-h-10" /> : <span className="text-xs text-gray-400">Logo</span>}
            </div>
            <div className="flex-1">
              <div className="font-medium">{l.company?.name ?? l.company_id}</div>
            </div>
            <button onClick={() => removeLink(l.id)} className="text-sm text-red-600 hover:underline">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}