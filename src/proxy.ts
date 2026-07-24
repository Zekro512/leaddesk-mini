import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

/**
 * Route protection. In Next.js 16 the `middleware` convention was renamed to
 * `proxy` (same behaviour, always the Node.js runtime), so this file is the
 * former `middleware.ts`.
 *
 * Built from the provider-free `authConfig`: this only needs to *verify* the
 * signed session cookie, not issue one, so Prisma and bcrypt stay out of the
 * bundle that runs on every matched request.
 *
 * This is the first of two layers. Each protected route handler independently
 * re-checks the session via `requireSession()` — a matcher typo here should
 * never be the only thing standing between an anonymous request and the data.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  // --- Public lead submission ---------------------------------------------
  // POST /api/leads is the whole point of the landing page: anyone may submit.
  // Every other method on /api/leads (GET list, PATCH status) is admin-only.
  if (pathname === "/api/leads" && req.method === "POST") {
    return NextResponse.next();
  }

  // --- Admin API ----------------------------------------------------------
  // API clients get a 401 rather than a redirect — an HTML login page is a
  // useless response to `fetch`, and it would mask the real failure.
  if (pathname.startsWith("/api/leads")) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.next();
  }

  // --- Admin pages --------------------------------------------------------
  // Note: Auth.js rewrites `nextUrl`'s origin to NEXTAUTH_URL before this
  // callback runs, and Next.js requires an absolute Location header, so these
  // redirects inherit that origin. NEXTAUTH_URL must therefore match the
  // deployment's real URL or admin sign-in bounces to the wrong host.
  const isLoginPage = pathname === "/admin/login";

  // Already signed in and hitting the login page: send them to the inbox.
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/admin/login", nextUrl);
    // Preserve where they were headed so login can bounce them back. Only the
    // path+query is carried, never an absolute URL, so this can't be turned
    // into an open redirect to another origin.
    loginUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Scoped tightly: static assets, the landing page and the Auth.js endpoints
  // themselves must never be intercepted.
  matcher: ["/admin/:path*", "/api/leads/:path*", "/api/leads"],
};
