import type { ReactNode } from 'react'
import OrgTopBar from '../TopBar'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar shared across all organizer pages */}
      <OrgTopBar />

      {/* Page chrome */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-4">
          <OrgBreadcrumbs />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <OrgSidebar />
          </aside>

          <main className="lg:col-span-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}