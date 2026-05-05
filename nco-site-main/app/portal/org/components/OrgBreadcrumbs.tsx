'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

function titleCase(s: string) {
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const LABEL_OVERRIDES: Record<string, string> = {
  portal: 'Portal',
  org: 'Organizer',
  events: 'Events',
  profile: 'Profile',
}

// simple in-memory cache so we don’t refetch titles repeatedly
const eventTitleCache = new Map<string, string>()

export default function OrgBreadcrumbs() {
  const pathname = usePathname() || ''
  const [eventTitle, setEventTitle] = useState<string | null>(null)
  const lastFetchedSlugRef = useRef<string | null>(null)

  if (!pathname.startsWith('/portal/org')) return null

  const parts = useMemo(
    () => pathname.split('/').filter(Boolean),
    [pathname]
  )

  // If this looks like /portal/org/events/[slug], pull the slug
  const eventSlug = parts.length >= 4 && parts[2] === 'events' ? parts[3] : null

  // Fetch event title for the slug (client-only, cached)
  useEffect(() => {
    if (!eventSlug) {
      setEventTitle(null)
      lastFetchedSlugRef.current = null
      return
    }

    if (eventTitleCache.has(eventSlug)) {
      setEventTitle(eventTitleCache.get(eventSlug) || null)
      return
    }

    // avoid duplicate fetches during fast nav
    if (lastFetchedSlugRef.current === eventSlug) return
    lastFetchedSlugRef.current = eventSlug

    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/portal/api/events/by-slug/${encodeURIComponent(eventSlug)}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('not ok')
        const data = await res.json() as { title?: string }
        const t = data?.title || null
        if (alive) {
          setEventTitle(t)
          if (t) eventTitleCache.set(eventSlug, t)
        }
      } catch {
        if (alive) setEventTitle(null)
      }
    })()

    return () => { alive = false }
  }, [eventSlug])

  // Build crumbs; replace the last segment label with fetched title when applicable
  const crumbs = parts
    .map((seg, idx) => {
      const href = '/' + parts.slice(0, idx + 1).join('/')
      const isLast = idx === parts.length - 1

      // Default label from overrides or title-cased segment
      let label =
        LABEL_OVERRIDES[seg] ||
        (seg.match(/^\[[^\]]+\]$/) ? '' : titleCase(seg)) ||
        ''

      // If this is the event slug segment (fourth segment) and we have a title, use it
      if (seg === eventSlug && eventTitle) label = eventTitle

      return { href, label, isLast }
    })
    .filter(c => c.label)

  // Hide on super-short paths (Portal > Organizer only)
  if (crumbs.length <= 2) return null

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-400">/</span>}
            {c.isLast ? (
              <span className="text-gray-800 font-medium" aria-current="page">
                {c.label}
              </span>
            ) : (
              <Link href={c.href} className="hover:text-usaBlue">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}