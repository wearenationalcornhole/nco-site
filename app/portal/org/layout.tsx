// app/portal/org/layout.tsx
import type { ReactNode } from 'react'
import { requireOrganizer } from '@/app/lib/auth'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'
// ❌ Do NOT import TopBar or OrgTopBar here
// import OrgTopBar from '@/app/portal/OrgTopBar' // remove this import if present

export default async function OrgLayout({ children }: { children: ReactNode }) {
  await requireOrganizer() // gate all nested pages

  return (
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
  )
}