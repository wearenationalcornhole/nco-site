// app/portal/(client)/layout.tsx
'use client';

import type { ReactNode } from 'react';

export default function ClientOnlyPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ✅ No TopBar here. The global one is in /app/portal/layout.tsx */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}