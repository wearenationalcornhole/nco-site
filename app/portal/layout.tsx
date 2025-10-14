// app/portal/layout.tsx
import type { ReactNode } from 'react'
import Providers from './Providers'

export const metadata = {
  title: 'NCO Portal',
  description:
    'Player, Organizer, and Admin management portal for the National Cornhole Organization.',
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>
}