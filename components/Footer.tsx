import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      {/* ── Top Section ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-800">
        {/* Logo + About */}
        <div>
          <Link href="/" className="flex items-center gap-2 mb-3">
            <Image
              src="/images/nco-mark.svg"
              alt="NCO Logo"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-semibold text-white">
              National Cornhole Organization
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-gray-400 max-w-sm">
            Building community through local cornhole — connecting players,
            organizers, and sponsors from every corner of the country.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-6 justify-between md:justify-start">
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/events"
                  className="hover:text-usaRed transition-colors"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/portal"
                  className="hover:text-usaRed transition-colors"
                >
                  Organizer Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="hover:text-usaRed transition-colors"
                >
                  Shop
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
              Connect
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="mailto:info@wearenationalcornhole.com"
                  className="hover:text-usaRed transition-colors"
                >
                  info@wearenationalcornhole.com
                </Link>
              </li>
              <li>
                <Link
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-usaRed transition-colors"
                >
                  Facebook
                </Link>
              </li>
              <li>
                <Link
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-usaRed transition-colors"
                >
                  Instagram
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup Placeholder */}
        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
            Stay Updated
          </h4>
          <p className="text-sm text-gray-400 mb-3">
            Get the latest events, updates, and NCO news.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex max-w-sm rounded overflow-hidden"
          >
            <input
              type="email"
              placeholder="Your email"
              className="flex-grow px-3 py-2 text-sm text-gray-900 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-usaBlue text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* ── Bottom Bar ─────────────────────────────────────────────── */}
      <div className="py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} National Cornhole Organization. All rights
        reserved. |{' '}
        <Link
          href="/privacy"
          className="hover:text-gray-300 transition-colors underline-offset-2"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}