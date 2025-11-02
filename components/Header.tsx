'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function Header() {
  const pathname = usePathname();

  // Hide the marketing header on any /portal route
  if (pathname?.startsWith('/portal')) {
    return null;
  }

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    { name: 'Shop', href: '/shop' },
    { name: 'Portal', href: '/portal' },
  ];

  return (
    <header className="bg-[#0A3161] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/nco-mark.png"
              alt="National Cornhole Organization"
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
              priority
            />
            <span className="ml-2 text-lg font-bold tracking-wide">
              National Cornhole
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-8">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'transition-colors duration-200 font-medium',
                  active ? 'text-accent hover:text-accent-light' : 'text-white hover:text-accent'
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}