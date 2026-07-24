import { z } from "zod";

/**
 * Login credentials schema — shared by the `/admin/login` form and the
 * NextAuth Credentials provider's `authorize()` callback, so a malformed
 * payload is rejected identically whether it comes from our own form or from
 * a hand-rolled POST.
 */
export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Enter a valid email address." })),
  // No complexity rules on *login* — strength is enforced when the password is
  // set, and a stricter rule here would only leak which passwords are valid.
  password: z
    .string({ message: "Password is required." })
    .min(1, { message: "Password is required." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFormValues = z.input<typeof loginSchema>;
