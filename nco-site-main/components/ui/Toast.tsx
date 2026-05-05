'use client';

import { useEffect } from 'react';

type Kind = 'success' | 'error';

export default function Toast({
  message,
  kind = 'success',
  onDone,
  duration = 2500,
}: {
  message: string;
  kind?: Kind;
  onDone?: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  const style =
    kind === 'error'
      ? 'bg-danger text-white'
      : 'bg-success text-white';

  const icon =
    kind === 'error' ? (
      // X / error
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm2.59-11.41a1 1 0 10-1.41-1.41L10 8.59 8.82 7.18a1 1 0 00-1.41 1.41L8.59 10l-1.18 1.41a1 1 0 101.41 1.41L10 11.41l1.41 1.41a1 1 0 001.41-1.41L11.41 10l1.18-1.41Z" clipRule="evenodd" />
      </svg>
    ) : (
      // Check / success
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4Z" clipRule="evenodd" />
      </svg>
    );

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50"
    >
      <div className={`shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 ${style}`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => onDone?.()}
          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Close notification"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}