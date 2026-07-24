import { handlers } from "@/auth";

/**
 * Auth.js catch-all endpoint. Serves /api/auth/signin, /callback/credentials,
 * /session, /csrf and /signout. `signIn()` / `signOut()` in the UI post here.
 */
export const { GET, POST } = handlers;
