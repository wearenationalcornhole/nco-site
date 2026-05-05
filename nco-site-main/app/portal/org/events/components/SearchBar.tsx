'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Debounce so we don't spam navigation
  const debounced = useDebounce(q, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debounced) params.set('q', debounced)
    else params.delete('q')
    params.set('page', '1') // reset page when searching
    router.replace(`${pathname}?${params.toString()}`)
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Search events…"
      className="w-full sm:w-80 rounded border px-3 py-2 text-sm"
      aria-label="Search events"
    />
  )
}

function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}