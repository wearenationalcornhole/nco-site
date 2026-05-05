// app/portal/Providers.tsx
'use client';

import type { ReactNode } from 'react';
import { DevAuthProvider } from '@/app/lib/devAuth';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <DevAuthProvider>
      {/* ✅ Removed duplicate <TopBar /> and unnecessary wrapper */}
      {children}
    </DevAuthProvider>
  );
}