'use client'
import { useState, useEffect } from 'react'

export default function Header() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const links: [string,string][] = [
    ['About', '#about'],
    ['Events', '/events'],
    ['Shop', '#shop'],
    ['Portal', '#portal'],
    ['Contact', '#contact'],
  ]

  return (
    <header className="sticky top-0 z-40 bg-usaBlue/95 backdrop-blur text-usaWhite">
      <div className="h-0.5 w-full bg-usaRed" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/images/nco-mark.webp" alt="NCO logo" className="h-8 w-8" />
            <span className="text-xl font-semibold tracking-tight">National Cornhole Organization</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {links.map(([label, href]) => (
              <a key={label} href={href}
                className="hover:text-usaRed rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usaRed focus-visible:ring-offset-2 focus-visible:ring-offset-usaBlue">
                {label}
              </a>
            ))}
            <a href="/events" className="inline-flex items-center rounded-full bg-usaRed px-4 py-2 font-semibold text-white hover:bg-[#8F1732]">
              Find Events
            </a>
          </nav>

          {/* Mobile toggle */}
          <button aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-xl p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usaRed">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {open ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 6h18M3 12h18M3 18h18"/>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-usaBlue">
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 grid grid-cols-2 gap-2">
            {links.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
                {label}
              </a>
            ))}
            <a href="/events" onClick={() => setOpen(false)}
               className="col-span-2 mt-1 inline-flex items-center justify-center rounded-full bg-usaRed px-4 py-2 font-semibold text-white hover:bg-[#8F1732]">
              Find Events
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
