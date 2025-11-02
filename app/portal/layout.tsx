// app/portal/layout.tsx
import type { ReactNode } from 'react'
import TopBar from '@/app/portal/TopBar' // single, central top bar for all /portal

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <TopBar /> {/* ← only once, here */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  )
}