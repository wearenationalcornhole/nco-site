'use client';

import { usePathname } from 'next/navigation';

export default function HideOnPortal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide global wrapper content on /portal routes
  if (pathname?.startsWith('/portal')) {
    return null;
  }

  return <>{children}</>;
}