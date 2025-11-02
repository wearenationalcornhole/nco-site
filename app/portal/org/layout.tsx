// app/portal/org/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'

// No TopBar import here — /portal/layout.tsx renders it once globally.

export default async function OrgLayout({ children }: { children: ReactNode }) {
  // 🔒 Server-side gate: must be signed in AND organizer/admin
  const supabase = getSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/portal/login?redirect=%2Fportal%2Forg')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
    redirect('/portal/dashboard')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-4">
        <OrgBreadcrumbs />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <OrgSidebar />
        </aside>
        <main className="lg:col-span-9">{children}</main>
      </div>
    </div>
  )
}