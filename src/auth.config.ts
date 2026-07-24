import type { NextAuthConfig } from "next-auth";

/**
 * Strip stray whitespace from the auth environment variables.
 *
 * Pasting a value into a hosting dashboard routinely drags in a leading tab or
 * a trailing newline. Auth.js reads NEXTAUTH_URL / AUTH_URL straight out of
 * `process.env` itself, so the only place to intercept that is here, before
 * the config below is constructed. The failure it prevents is a nasty one:
 * the app boots fine and only post-login redirects break, pointing at a
 * malformed origin.
 */
for (const key of [
  "NEXTAUTH_URL",
  "AUTH_URL",
  "NEXTAUTH_SECRET",
  "AUTH_SECRET",
] as const) {
  const value = process.env[key];
  if (value && value !== value.trim()) {
    process.env[key] = value.trim();
  }
}

/**
 * Provider-free half of the Auth.js configuration.
 *
 * `proxy.ts` needs to *verify* a session on every matched request, but it must
 * not drag Prisma and bcrypt into that bundle — those are only needed to
 * *create* a session, which happens once, inside `auth.ts`. Splitting the
 * config keeps the request-path code small and side-effect free; both halves
 * share the same `secret`, so the JWT signed in `auth.ts` verifies here.
 */
export const authConfig = {
  // Auth.js v5 reads AUTH_SECRET by default. This project standardises on the
  // NEXTAUTH_* names (as specified in .env.example), so pass it explicitly and
  // accept either — otherwise a deploy that only sets one silently fails.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  // Vercel terminates TLS upstream, so the forwarded Host header is what
  // identifies the deployment. Without this Auth.js rejects it as untrusted.
  trustHost: true,

  session: {
    // Credentials logins cannot use database sessions — Auth.js only persists
    // sessions for providers that go through an adapter — so the session lives
    // entirely in a signed+encrypted JWT stored in an httpOnly cookie.
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },

  callbacks: {
    /**
     * Runs whenever a JWT is created or rotated. `user` is only present on the
     * initial sign-in, which is the one chance to copy the database id onto
     * the token — after that the token is the only state we have.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    /** Mirrors the token's id onto `session.user` for use in server code. */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // Populated in `auth.ts`. Kept empty here so this module stays dependency-free.
  providers: [],
} satisfies NextAuthConfig;
