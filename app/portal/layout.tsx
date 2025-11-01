// app/portal/layout.tsx
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import TopBar from './TopBar'

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Global portal header */}
      <TopBar />

      {/* Shared container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* This prevents CSR-bailout/Suspense warnings from child pages using client hooks */}
        <Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Loading…</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  )
}