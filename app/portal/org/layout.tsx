// app/portal/org/layout.tsx
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';
import { canUseOrganizerTools } from '@/app/lib/profileCapabilities';
import OrgSidebar from './components/OrgSidebar';
import OrgBreadcrumbs from './components/OrgBreadcrumbs';

// Note: TopBar is rendered once in /app/portal/layout.tsx

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/portal/login?redirect=/portal/org');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !canUseOrganizerTools(profile.role)) {
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
        <main className="lg:col-span-9">
          {children}
        </main>
      </div>
    </div>
  );
}
