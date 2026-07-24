import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Second layer of route protection, applied inside each protected handler.
 *
 * `proxy.ts` already blocks unauthenticated requests, but relying on a single
 * matcher pattern is fragile — one typo and a route silently becomes public.
 * These handlers therefore verify the session themselves as well.
 *
 * Returns `null` when the caller is authenticated, or a ready-to-return 401
 * response when they are not:
 *
 *   const unauthorized = await requireSession();
 *   if (unauthorized) return unauthorized;
 */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return null;
}
