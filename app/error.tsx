'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Route error:', error);
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-gray-600">
        An error occurred while loading this page.
      </p>
      {error?.digest ? (
        <p className="mt-2 text-xs text-gray-500">Digest: {error.digest}</p>
      ) : null}
      <button
        onClick={() => reset()}
        className="mt-4 rounded bg-usaBlue px-4 py-2 text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}