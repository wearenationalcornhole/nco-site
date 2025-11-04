// app/portal/org/layout.tsx
import type { ReactNode } from 'react';
import OrgSidebar from './components/OrgSidebar';
import OrgBreadcrumbs from './components/OrgBreadcrumbs';
import AuthGate from './AuthGate';

// Note: TopBar is rendered once in /app/portal/layout.tsx

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
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
    </AuthGate>
  );
}