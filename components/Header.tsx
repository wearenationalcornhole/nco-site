// components/Header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Header() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [portalHref, setPortalHref] = useState('/portal/login?redirect=%2Fportal')

  // Decide where the Portal link should go based on auth status
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!alive) return
      setPortalHref(session ? '/portal/dashboard' : '/portal/login?redirect=%2Fportal')
    })()
    return () => { alive = false }
  }, [supabase])

  // Smarter active state: highlight nested routes too
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    { name: 'Shop', href: '/shop' },
    // Portal is dynamic based on auth
    { name: 'Portal', href: portalHref, match: '/portal' },
  ]

  return (
    <header className="bg-[#0A3161] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/nco-mark.png"
              alt="National Cornhole Organization"
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
              priority
            />
            <span className="ml-2 text-lg font-bold tracking-wide">
              National Cornhole
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-8">
          {navItems.map((item) => {
            // For Portal, use `match` to evaluate active state (since href is dynamic)
            const active = isActive(item.match ?? item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'transition-colors duration-200 font-medium',
                  active
                    ? 'text-accent hover:text-accent-light'
                    : 'text-white hover:text-accent'
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Future: user/account button, mobile menu, etc. */}
      </div>
    </header>
  )
}