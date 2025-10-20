import type { ReactNode } from 'react'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    // Do NOT re-wrap in page container here; portal root already does it.
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-3">
        <OrgSidebar />
      </aside>

      <main className="lg:col-span-9">
        {/* Keep breadcrumbs small; no big header bar */}
        <div className="mb-4">
          <OrgBreadcrumbs />
        </div>

        {children}
      </main>
    </div>
  )
}