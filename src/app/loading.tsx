/**
 * Route-level loading state. Shown while a server component's data is in
 * flight, so a slow database never leaves the viewport blank.
 */
export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-20">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <svg
          className="h-5 w-5 animate-spin text-brand-600"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
          />
        </svg>
        Loading…
      </div>
    </div>
  );
}
