// app/portal/org/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import OrgSidebar from './components/OrgSidebar'
import OrgBreadcrumbs from './components/OrgBreadcrumbs'

// TopBar is rendered once in /app/portal/layout.tsx — don't import it here.

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServer()

  // ✅ Use getUser() (read-only) instead of getSession() (may try to refresh/write)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Forg')
  }

  // Gate: must be organizer or admin
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
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
        <main className="lg:col-span-9">
          {children}
        </main>
      </div>
    </div>
  )
}