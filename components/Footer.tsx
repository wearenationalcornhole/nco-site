// components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <img
                src="/images/nco-mark.svg"
                alt="NCO"
                className="h-8 w-8"
                loading="lazy"
              />
              <span className="font-semibold text-gray-900">
                National Cornhole Organization
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Bringing Local Cornhole Together.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/events" className="text-gray-600 hover:text-gray-900">Find Events</Link></li>
              <li><Link href="/portal" className="text-gray-600 hover:text-gray-900">Organizer Portal</Link></li>
              <li><Link href="/shop" className="text-gray-600 hover:text-gray-900">Shop</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/#about" className="text-gray-600 hover:text-gray-900">About</Link></li>
              <li><Link href="/#contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
              <li><Link href="/#sponsors" className="text-gray-600 hover:text-gray-900">Sponsors</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-sm text-gray-500">
          © {new Date().getFullYear()} National Cornhole Organization. All rights reserved.
        </div>
      </div>
    </footer>
  )
}