import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
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
            <Link href="/" className="hover:text-accent transition-colors">
              Home
            </Link>
            <Link href="/events" className="hover:text-accent transition-colors">
              Events
            </Link>
            <Link href="/shop" className="hover:text-accent transition-colors">
              Shop
            </Link>
            <Link href="/portal" className="hover:text-accent transition-colors">
              Portal
            </Link>
            <Link href="/about" className="hover:text-accent transition-colors">
              About
            </Link>
          </nav>
        </div>

        {/* Bottom Row — Copyright */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-white/80">
          <p>
            © {new Date().getFullYear()} National Cornhole Organization. All rights reserved.
          </p>
          <div className="flex gap-4 mt-3 sm:mt-0">
            <Link
              href="/privacy"
              className="hover:text-accent transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-accent transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}