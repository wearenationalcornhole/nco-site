'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function HideOnPortal({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Hide whenever the URL starts with /portal
  if (pathname?.startsWith('/portal')) return null
  return <>{children}</>
}