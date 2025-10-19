'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Subtle shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close on route change (best-effort: close on click)
  function closeMenu() {
    setOpen(false)
  }

  return (
    <header
      className={`sticky top-0 z-50 bg-#0A3161 text-white ${
        scrolled ? 'shadow-lg shadow-black/20' : ''
      }`}
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2" aria-label="NCO Home">
            <Image
              src="/images/nco-mark.pngg"
              alt="NCO"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="hidden sm:inline text-base font-semibold tracking-tight">
              National Cornhole Organization
            </span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <HeaderLink href="/events">Events</HeaderLink>
          <HeaderLink href="/portal">Portal</HeaderLink>
          <HeaderLink href="/shop">Shop</HeaderLink>
          <Link
            href="/portal/login"
            className="inline-flex items-center rounded-md bg-usaBlue px-3 py-2 font-medium hover:opacity-90"
          >
            Sign in
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md border border-white/20 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Open menu</span>
          {/* Hamburger / Close icon (pure CSS) */}
          <div className="relative h-3.5 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 bg-0A3161 transition-transform ${
                open ? 'translate-y-1.5 rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 h-0.5 w-5 bg-white transition-opacity ${
                open ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute left-0 top-3 h-0.5 w-5 bg-white transition-transform ${
                open ? '-translate-y-1.5 -rotate-45' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Panel */}
      <div
        className={`md:hidden transition-[max-height,opacity] duration-200 ease-out overflow-hidden border-t border-white/10 ${
          open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!open}
      >
        <nav className="px-4 sm:px-6 lg:px-8 py-4 space-y-1 text-sm">
          <MobileLink href="/events" onClick={closeMenu}>
            Events
          </MobileLink>
          <MobileLink href="/portal" onClick={closeMenu}>
            Organizer Portal
          </MobileLink>
          <MobileLink href="/shop" onClick={closeMenu}>
            Shop
          </MobileLink>

          <div className="pt-3">
            <Link
              href="/portal/login"
              onClick={closeMenu}
              className="inline-flex w-full items-center justify-center rounded-md bg-usaBlue px-3 py-2 font-medium hover:opacity-90"
            >
              Sign in
            </Link>
          </div>

          {/* Tagline bar */}
          <div className="mt-4 rounded-md bg-usaRed/10 border border-usaRed/30 px-3 py-2 text-xs text-gray-300">
            Bringing Local Cornhole Together
          </div>
        </nav>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────── */

function HeaderLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-gray-200 hover:text-white transition-colors"
    >
      {children}
    </Link>
  )
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-md px-3 py-2 text-gray-200 hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  )
}