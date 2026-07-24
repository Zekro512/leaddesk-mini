"use client";

import { useTransition } from "react";

import { signOutAction } from "@/app/admin/actions";

/**
 * Calls a server action that runs Auth.js `signOut()`, which clears the
 * session cookie and redirects. Doing it server-side means the cookie is
 * expired by a `Set-Cookie` header rather than trusted client-side code.
 */
export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOutAction())}
      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
