import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-3 text-slate-600">
          That page doesn&rsquo;t exist. It may have been moved or the link was
          mistyped.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
