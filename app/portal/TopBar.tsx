// app/portal/TopBar.tsx
'use client'

import Link from 'next/link'
import { useAuth } from '@/app/lib/devAuth'

export default function TopBar() {
  const { user, loginAs, logout } = useAuth()

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/portal" className="font-semibold">NCO Portal</Link>
          <Link href="/portal/events">Events</Link>
          {user?.role !== 'PLAYER' && <Link href="/portal/org/events">Organizer</Link>}
          {user?.role === 'ADMIN' && <Link href="/portal/admin/organizers">Admin</Link>}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          {!user ? (
            <>
              <button className="border rounded px-2 py-1" onClick={() => loginAs('PLAYER')}>Login as Player</button>
              <button className="border rounded px-2 py-1" onClick={() => loginAs('ORGANIZER')}>Login as Organizer</button>
              <button className="border rounded px-2 py-1" onClick={() => loginAs('ADMIN')}>Login as Admin</button>
            </>
          ) : (
            <>
              <span className="text-gray-600">{user.name} · {user.role}</span>
              <button className="border rounded px-2 py-1" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}