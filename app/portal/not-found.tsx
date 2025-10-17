// app/portal/not-found.tsx
import Link from 'next/link'

export default function PortalNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-2xl font-semibold">Nothing here (yet)</h1>
      <p className="mt-2 text-gray-600">
        That portal page doesn’t exist. Try the Organizer Console or Events.
      </p>
      <div className="mt-6 flex gap-3 justify-center">
        <Link href="/portal" className="rounded border px-4 py-2 hover:bg-gray-50">Portal Home</Link>
        <Link href="/portal/org/events" className="rounded bg-usaBlue text-white px-4 py-2 hover:opacity-90">Organizer Console</Link>
      </div>
    </div>
  )
}