'use client'

// Renders for any error at the root of the app
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  console.error('GlobalError:', error)
  return (
    <html>
      <body style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Something went wrong</h1>
        <p style={{ color: '#666' }}>{error?.message}</p>
        {error?.digest && <p style={{ color: '#999' }}>Digest: {error.digest}</p>}
        <button onClick={() => reset()} style={{ marginTop: 12, padding: '8px 12px' }}>
          Try again
        </button>
      </body>
    </html>
  )
}