import type { DefaultSession } from "next-auth";

/**
 * Auth.js module augmentation.
 *
 * The `jwt` and `session` callbacks in `auth.config.ts` copy the AdminUser's
 * database id onto the token and session; these declarations tell TypeScript
 * about that extra field so `session.user.id` is typed rather than `any`.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export {};
