'use client'

export default function PortalError({ error, reset }: { error: Error; reset: () => void }) {
  console.error('Portal Error:', error)
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold">Portal Error</h2>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button onClick={() => reset()} className="mt-4 rounded bg-usaBlue text-white px-3 py-2 hover:opacity-90">
        Try again
      </button>
    </div>
  )
}