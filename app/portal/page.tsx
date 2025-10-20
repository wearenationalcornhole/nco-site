// app/portal/page.tsx
import Link from 'next/link'

export default function PortalHome() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900">NCO Portal</h1>
      <p className="mt-2 text-gray-600">
        Welcome to the National Cornhole Organization Portal. We’re rolling features out in phases.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-usaBlue">Players</h2>
          <p className="mt-2 text-sm text-gray-600">
            Browse public event pages and register (demo).
          </p>
          <div className="mt-4">
            <Link href="/events" className="inline-block rounded bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90">
              Find Events
            </Link>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-usaBlue">Organizers</h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage events, add sponsors, upload logos, review bag submissions.
          </p>
          <div className="mt-4">
            <Link href="/portal/org/events" className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50">
              Go to Organizer Console
            </Link>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-usaBlue">Admins</h2>
          <p className="mt-2 text-sm text-gray-600">
            Admin features are coming soon.
          </p>
          <div className="mt-4">
            <span className="inline-block rounded bg-gray-200 px-4 py-2 text-sm text-gray-600">
              Coming Soon
            </span>
          </div>
        </section>
      </div>

      <div className="mt-10">
        <p className="text-xs text-gray-500">
          Note: Certain areas may require organizer access. Bags are internal-use only and not public.
        </p>
      </div>
    </div>
  )
}