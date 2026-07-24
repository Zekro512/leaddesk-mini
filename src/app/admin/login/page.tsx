import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export const dynamic = "force-dynamic";

/**
 * `searchParams` is a Promise in Next.js 16 — synchronous access to
 * request-time data was removed in this major version.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Only relative, same-origin paths are honoured; anything else falls back to
  // the inbox. Validated again inside the server action.
  const safeCallbackUrl =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/admin";

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white"
          aria-label="Back to the landing page"
        >
          LD
        </Link>

        <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to LeadDesk
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          The lead inbox is private. Use your admin credentials.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <LoginForm callbackUrl={safeCallbackUrl} />
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="text-slate-500 transition hover:text-slate-900"
          >
            ← Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}
