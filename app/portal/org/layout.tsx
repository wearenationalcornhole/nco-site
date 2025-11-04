// app/portal/org/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';
import OrgSidebar from './components/OrgSidebar';
import OrgBreadcrumbs from './components/OrgBreadcrumbs';

// IMPORTANT: Do NOT import or render TopBar here.
// TopBar is already rendered once in /app/portal/layout.tsx.

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const supabase = getSupabaseServer(); // sync, cookie-read only

  // Gate: must be signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Forg');
  }

  // Gate: must be organizer or admin
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
    redirect('/portal/dashboard');
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
  );
}