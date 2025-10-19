import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'National Cornhole Organization',
  description:
    'Connecting players, organizers, and sponsors across the country through local cornhole tournaments and leagues.',
  openGraph: {
    title: 'National Cornhole Organization',
    description:
      'Find tournaments, host events, and join the growing cornhole community.',
    url: 'https://www.wearenationalcornhole.com',
    siteName: 'National Cornhole Organization',
    images: [
      {
        url: '/images/hero-cornhole.webp',
        width: 1200,
        height: 630,
        alt: 'National Cornhole Organization',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased text-gray-900 bg-#0A3161 min-h-screen flex flex-col">
        {/* ── Fixed Header ───────────────────────────────────────────── */}
        <Header />

        {/* ── Main Content ───────────────────────────────────────────── */}
        {/* Add padding top so content isn’t hidden under fixed header */}
        <main className="flex-grow pt-16">{children}</main>

        {/* ── Footer (optional) ───────────────────────────────────────── */}
        <Footer />
      </body>
    </html>
  )
}