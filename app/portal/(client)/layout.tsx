'use client';

import type { ReactNode } from 'react';
import TopBar from '../TopBar'; // same TopBar you already use under /portal

export default function ClientOnlyPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}