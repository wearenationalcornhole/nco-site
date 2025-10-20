// app/portal/org/layout.tsx
import type { ReactNode } from 'react'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'
import { requireOrganizer } from '@/app/lib/auth'

export default async function OrgLayout({ children }: { children: ReactNode }) {
  // Gate: must be signed-in + organizer (or admin)
  await requireOrganizer()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-4">
        <OrgBreadcrumbs />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <OrgSidebar />
        </div>
        <main className="lg:col-span-9">
          {children}
        </main>
      </div>
    </div>
  )
}