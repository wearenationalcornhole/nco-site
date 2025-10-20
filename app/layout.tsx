import './globals.css'
import type { ReactNode } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HideOnPortal from './HideOnPortal'

export const metadata = {
  title: 'National Cornhole Organization',
  description: 'Connecting players, clubs, and events across the nation.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen bg-[#0A3161] text-white font-sans">
        {/* ─── Global Header (hidden inside /portal) ───────────────────────────── */}
        <HideOnPortal>
          <Header />
        </HideOnPortal>

        {/* ─── Main Content ────────────────────────────────────────────────────── */}
        <main className="flex-1 bg-white text-gray-900">
          {children}
        </main>

        {/* ─── Global Footer (hidden inside /portal) ───────────────────────────── */}
        <HideOnPortal>
          <Footer />
        </HideOnPortal>
      </body>
    </html>
  )
}