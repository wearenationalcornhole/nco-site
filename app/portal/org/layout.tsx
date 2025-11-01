import type { ReactNode } from 'react'
import { requireOrganizer } from '@/app/lib/auth'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'
import OrgTopBar from '@/app/portal/OrgTopBar'

export default async function OrgLayout({ children }: { children: ReactNode }) {
  await requireOrganizer() // 🔒 gate all nested pages

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