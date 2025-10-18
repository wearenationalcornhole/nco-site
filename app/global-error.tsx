'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Global error:', error);
  return (
    <html>
      <body>
        <div className="mx-auto max-w-2xl p-6">
          <h1 className="text-2xl font-bold">App crashed</h1>
          <p className="mt-2 text-gray-600">
            A fatal error occurred. You can try to recover.
          </p>
          {error?.digest ? (
            <p className="mt-2 text-xs text-gray-500">Digest: {error.digest}</p>
          ) : null}
          <button
            onClick={() => reset()}
            className="mt-4 rounded bg-usaBlue px-4 py-2 text-white hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}