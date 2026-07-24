"use server";

import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Server actions for the admin session.
 *
 * Sign-in runs on the server so the password is only ever in a POST body — it
 * never reaches client-side JavaScript state, and the Set-Cookie that
 * establishes the session comes straight from Auth.js.
 */

export type LoginActionResult = { error: string } | undefined;

export async function signInAction(
  email: string,
  password: string,
  callbackUrl: string,
): Promise<LoginActionResult> {
  // Third validation pass on the same schema (client form → here → the
  // provider's `authorize`). Cheap, and it keeps the action safe to call
  // from anywhere.
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }

  // Only same-origin paths are accepted as a post-login destination, so a
  // crafted ?callbackUrl=https://evil.example can't turn this into an open
  // redirect.
  const safeCallbackUrl =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/admin";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl,
    });
  } catch (error) {
    // `signIn` signals a successful login by throwing a Next.js redirect.
    // That must propagate — swallowing it would leave the user on the form
    // with a valid session and no navigation.
    if (isNextRedirectError(error)) throw error;

    // Everything else is a failed attempt. The message is deliberately vague:
    // "no such account" vs "wrong password" is an enumeration oracle.
    return { error: "Incorrect email or password." };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

/**
 * Next.js implements `redirect()` by throwing a tagged error. There is no
 * public predicate for it, so this checks the documented `digest` marker.
 */
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
