"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Without this, an unhandled exception in any server
 * component renders a blank page in production — the exact "white screen on a
 * fresh deploy" failure mode this guards against.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-brand-600">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          We hit an unexpected error
        </h1>
        <p className="mt-3 text-slate-600">
          The page couldn&rsquo;t be loaded. This is usually temporary — try
          again, and if it keeps happening the server logs will have the detail.
        </p>

        {/* The digest is the only safe handle on the server-side stack trace,
            which is deliberately not sent to the browser. */}
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-slate-400">
            Reference: {error.digest}
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
