import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  const year = new Date().getFullYear()
  const primaryLinks = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    { href: '/community', label: 'Community' },
    { href: '/clubs', label: 'Clubs' },
    { href: '/shop', label: 'Shop' },
    { href: '/about', label: 'About' },
    { href: '/portal', label: 'Join Community' },
  ]
  const legalLinks = [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ]

  return (
    <footer className="bg-[#0A3161] text-white py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Row — Logo + Quick Links */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b border-white/20 pb-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/nco-mark.png"
              alt="National Cornhole Organization Logo"
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
            />
            <span className="text-lg font-bold tracking-wide">
              National Cornhole
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-accent transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom Row — Copyright */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-white/80">
          <p>
            © {year} National Cornhole Organization. All rights reserved.
          </p>
          <div className="flex gap-4 mt-3 sm:mt-0">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
