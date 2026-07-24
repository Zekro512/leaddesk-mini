import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const metadata: Metadata = { title: "Lead inbox" };

// The session is read per-request, so this page can never be prerendered.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  /**
   * `proxy.ts` already redirects anonymous visitors here, but this page checks
   * again rather than assuming the matcher is correct. It also gives us the
   * signed-in email to display.
   */
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login?callbackUrl=%2Fadmin");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
              aria-label="Back to the landing page"
            >
              LD
            </Link>
            <div>
              <h1 className="font-semibold tracking-tight text-slate-900">
                Lead inbox
              </h1>
              <p className="text-xs text-slate-500">
                Signed in as {session.user.email}
              </p>
            </div>
          </div>

          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <LeadsTable />
      </main>
    </div>
  );
}
