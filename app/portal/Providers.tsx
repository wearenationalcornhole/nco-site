// app/portal/Providers.tsx
'use client'

import type { ReactNode } from 'react'
import { DevAuthProvider } from '@/app/lib/devAuth'
import TopBar from './TopBar'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <DevAuthProvider>
      <TopBar />
      <main className="bg-neutral-50 min-h-[calc(100vh-56px)] p-4 md:p-6">
        {children}
      </main>
    </DevAuthProvider>
  )
}