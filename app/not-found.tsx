// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="text-xs uppercase tracking-wider text-gray-500">404</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
        Page not found
      </h1>
      <p className="mt-3 text-gray-600">
        Sorry, we couldn’t find the page you’re looking for.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-usaBlue px-4 py-2 text-white hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/events"
          className="inline-flex items-center rounded-md border px-4 py-2 text-gray-800 hover:bg-gray-50"
        >
          Browse events
        </Link>
      </div>
    </div>
  )
}