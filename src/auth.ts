import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Full Auth.js instance — the only place that touches the database or bcrypt.
 *
 * There is deliberately no hardcoded password anywhere in this file. The only
 * thing the app can do is hash an incoming attempt and compare it against the
 * bcrypt digest stored on the AdminUser row (written by `prisma/seed.ts`).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // Auth.js renders a default sign-in form from these; we use our own page
      // at /admin/login, but declaring them keeps the provider self-describing.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * Returns a user object to sign in, or `null` to reject. Auth.js turns a
       * `null` return into a generic CredentialsSignin error — we never tell
       * the client *which* half was wrong, since "no such email" vs "wrong
       * password" is a free account-enumeration oracle.
       */
      async authorize(rawCredentials) {
        // Same schema the login form uses — a hand-crafted POST gets the same
        // treatment as our own UI.
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const admin = await prisma.adminUser.findUnique({
          where: { email },
          select: { id: true, email: true, passwordHash: true },
        });

        if (!admin) {
          // Burn roughly the same time as a real bcrypt comparison so response
          // timing doesn't reveal whether the account exists.
          await compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
          return null;
        }

        const passwordMatches = await compare(password, admin.passwordHash);
        if (!passwordMatches) return null;

        // Whatever is returned here is handed to the `jwt` callback as `user`.
        // The hash is intentionally not included.
        return { id: admin.id, email: admin.email };
      },
    }),
  ],
});
