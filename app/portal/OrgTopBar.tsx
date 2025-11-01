'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

type Props = {
  isAuthed?: boolean
  userName?: string | null
}

export default function OrgTopBar({ isAuthed = false, userName = null }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-[#0A3161] text-white shadow-md shadow-black/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2">
          <Link href="/portal/org" className="flex items-center gap-2">
            <Image
              src="/images/nco-mark.png"
              alt="NCO"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-sm sm:text-base font-semibold tracking-tight text-white">
              Community Portal
            </span>
          </Link>
        </div>

        {/* Right: Menu / Profile Area */}
        <div className="flex items-center gap-3">
          <Link
            href="/portal/org/profile"
            className="hidden sm:inline text-sm text-white/80 hover:text-white transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/portal/org/events"
            className="hidden sm:inline text-sm text-white/80 hover:text-white transition-colors"
          >
            Events
          </Link>
          <Link
            href="/portal/org/players"
            className="hidden sm:inline text-sm text-white/80 hover:text-white transition-colors"
          >
            Players
          </Link>

          {/* Auth actions */}
          {isAuthed ? (
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-white/80 truncate max-w-[14rem]">
                {userName ?? 'Signed in'}
              </span>
              <Link
                href="/portal/logout"
                className="text-sm rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10 transition"
              >
                Sign out
              </Link>
            </div>
          ) : (
            <Link
              href="/portal/login?next=/portal/org"
              className="hidden sm:inline text-sm rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10 transition"
            >
              Sign in
            </Link>
          )}

          {/* Hamburger for small screens */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden rounded-md border border-white/20 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Toggle dashboard menu"
          >
            <div className="relative h-3.5 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 bg-white transition-transform ${
                  menuOpen ? 'translate-y-1.5 rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-5 bg-white transition-opacity ${
                  menuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 top-3 h-0.5 w-5 bg-white transition-transform ${
                  menuOpen ? '-translate-y-1.5 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        className={`sm:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
          menuOpen ? 'max-h-56 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="px-4 pb-4 space-y-1 text-sm bg-[#0A3161] border-t border-white/10">
          <MobileLink href="/portal/org/profile" onClick={() => setMenuOpen(false)}>
            Profile
          </MobileLink>
          <MobileLink href="/portal/org/events" onClick={() => setMenuOpen(false)}>
            Events
          </MobileLink>
          <MobileLink href="/portal/org/players" onClick={() => setMenuOpen(false)}>
            Players
          </MobileLink>
          {isAuthed ? (
            <MobileLink href="/portal/logout" onClick={() => setMenuOpen(false)}>
              Sign out{userName ? ` (${userName})` : ''}
            </MobileLink>
          ) : (
            <MobileLink href="/portal/login?next=/portal/org" onClick={() => setMenuOpen(false)}>
              Sign in
            </MobileLink>
          )}
          <MobileLink href="/portal" onClick={() => setMenuOpen(false)}>
            Exit Portal
          </MobileLink>
        </nav>
      </div>
    </header>
  )
}

/* Subcomponent */
function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-md px-3 py-2 text-white/85 hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </Link>
  )
}