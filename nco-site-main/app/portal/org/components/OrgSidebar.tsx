'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/portal/org',         label: 'Dashboard' },
  { href: '/portal/org/events',  label: 'Events' },
  { href: '/portal/org/profile', label: 'Organizer Profile' },
]

export default function OrgSidebar() {
  const pathname = usePathname()
  return (
    <nav className="rounded-2xl border bg-white p-4">
      <h2 className="text-xs uppercase tracking-wider text-gray-500 px-2">Organizer</h2>
      <ul className="mt-2 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? 'bg-usaBlue/10 text-usaBlue'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}