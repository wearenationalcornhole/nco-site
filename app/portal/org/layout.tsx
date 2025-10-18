// app/portal/org/layout.tsx
import type { ReactNode } from 'react'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page chrome header for organizer area */}
        <div className="mb-4">
          <OrgBreadcrumbs />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sticky sidebar on desktop */}
          <aside className="lg:col-span-3 lg:sticky lg:top-6 h-fit">
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