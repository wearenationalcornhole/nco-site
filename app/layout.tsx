import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/react";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://wearenationalcornhole.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'National Cornhole Organization',
    template: '%s — National Cornhole Organization',
  },
  description: 'Find tournaments, track your rise, and throw with gear built to win.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'National Cornhole Organization',
    description: 'Find tournaments, track your rise, and throw with gear built to win.',
    url: SITE,
    siteName: 'National Cornhole Organization',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'National Cornhole Organization' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'National Cornhole Organization',
    description: 'Find tournaments, track your rise, and throw with gear built to win.',
    images: ['/twitter-image.png'],
    creator: '@wearenationalcornhole',
  },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preload the most important image to improve LCP */}
        <link rel="preload" as="image" href="/images/hero-cornhole.webp" />
      </head>
      <body className="bg-neutral-100 text-gray-900">{children} <Analytics /></body>
    </html>
  )
}