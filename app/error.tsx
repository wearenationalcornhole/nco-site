'use client'

// Catches errors under the default (root) layout
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  console.error('Route Error:', error)
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="text-xl font-semibold">Page Error</h2>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button onClick={() => reset()} className="mt-4 rounded border px-3 py-2 hover:bg-gray-50">
        Retry
      </button>
    </div>
  )
}