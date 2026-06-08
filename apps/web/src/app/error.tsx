'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GeoCampo]', error);
  }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-charcoal gap-6 p-8 text-center">
      <span className="text-6xl">⚠️</span>
      <div>
        <h1 className="text-white text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted text-sm max-w-sm">{error.message || 'An unexpected error occurred.'}</p>
        {error.digest && (
          <p className="text-muted text-xs mt-2 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl font-bold text-charcoal text-sm transition-all hover:brightness-110"
        style={{ backgroundColor: '#DEFF9A' }}
      >
        Try again
      </button>
    </div>
  );
}
