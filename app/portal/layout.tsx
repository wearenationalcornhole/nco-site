import type { ReactNode } from 'react'
import TopBar from './TopBar'

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Single global header for all /portal pages */}
      <TopBar />

      {/* Shared page container/padding for all portal pages */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  )
}