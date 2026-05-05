'use client'
import { useEffect, useState } from 'react'

type Company = {
  id: string
  name: string
  website?: string | null
  logo?: string | null
  logoHash?: string | null
  sponsoredEvents: number
  createdAt?: string
}

export default function OrgSponsorsClient() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function search() {
    setLoading(true)
    const res = await fetch(`/portal/api/companies?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setLoading(false)
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Search sponsors by name or website"
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={search}
          className="rounded bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90"
        >
          Search
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
          <div className="col-span-5">Company</div>
          <div className="col-span-5">Website</div>
          <div className="col-span-2 text-right">Events</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-gray-600">No sponsors found.</div>
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-10 w-14 rounded bg-gray-100 overflow-hidden">
                      {c.logo ? (
                        <img src={c.logo} alt={`${c.name} logo`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-content-center text-xs text-gray-400">
                          No logo
                        </div>
                      )}
                    </div>
                    <div className="font-medium">
                      <a
                        href={`/portal/api/companies/${c.id}`}
                        target="_blank"
                        className="hover:underline"
                      >
                        {c.name}
                      </a>
                    </div>
                  </div>
                  <div className="col-span-5 text-sm text-blue-700 truncate">
                    {c.website ? (
                      <a href={c.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {c.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm">{c.sponsoredEvents}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}