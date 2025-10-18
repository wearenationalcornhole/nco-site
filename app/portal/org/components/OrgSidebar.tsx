'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Item = { href: string; label: string; startsWith?: boolean }

const ITEMS: Item[] = [
  { href: '/portal/org',           label: 'Dashboard' },
  { href: '/portal/org/events',    label: 'Events', startsWith: true },
  { href: '/portal/org/profile',   label: 'Profile' },
  // Add more when ready:
  // { href: '/portal/org/sponsors',  label: 'Sponsors' },
]

export default function OrgSidebar() {
  const pathname = usePathname()

  return (
    <aside className="rounded-2xl border bg-white p-4 lg:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-2">
        Organizer
      </h2>
      <nav className="mt-3 grid">
        {ITEMS.map((item) => {
          const active = item.startsWith
            ? pathname.startsWith(item.href)
            : pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition
                ${active
                  ? 'bg-usaBlue text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}