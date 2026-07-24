import { z } from "zod";

/**
 * Single source of truth for lead validation.
 *
 * This module is imported by BOTH the browser (react-hook-form resolver in
 * `LeadForm`) and the server (the `/api/leads` route handlers), so the rules
 * can never drift apart. It deliberately imports nothing from `@prisma/client`
 * — that package must not end up in the client bundle — so the enum values
 * below are literal unions kept in lockstep with `prisma/schema.prisma`. The
 * type-level guard in `src/lib/leads.ts` fails the build if they ever diverge.
 */

// --- Enums -----------------------------------------------------------------

export const BUDGET_RANGES = [
  "UNDER_1K",
  "FROM_1K_TO_5K",
  "FROM_5K_TO_20K",
  "OVER_20K",
] as const;

export const LEAD_STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;

export type BudgetRangeValue = (typeof BUDGET_RANGES)[number];
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

/** Human-readable labels for the budget dropdown and the admin table. */
export const BUDGET_RANGE_LABELS: Record<BudgetRangeValue, string> = {
  UNDER_1K: "Under $1k",
  FROM_1K_TO_5K: "$1k – $5k",
  FROM_5K_TO_20K: "$5k – $20k",
  OVER_20K: "$20k+",
};

export const LEAD_STATUS_LABELS: Record<LeadStatusValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
};

// --- Field-level rules -----------------------------------------------------

/**
 * Trim and lowercase BEFORE checking the format. Zod applies chained
 * transforms after the preceding check runs, so `z.email().trim()` would
 * reject "  a@b.com  " — the whitespace is still there when the format check
 * happens. Piping a normalised string into `z.email()` fixes the order.
 */
const emailField = z
  .string({ message: "Email is required." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address." }));

// --- Create (public lead submission) ---------------------------------------

export const createLeadSchema = z.object({
  name: z
    .string({ message: "Name is required." })
    .trim()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(80, { message: "Name must be 80 characters or fewer." }),
  email: emailField,
  budgetRange: z.enum(BUDGET_RANGES, {
    message: "Select a budget range.",
  }),
  message: z
    .string({ message: "Message is required." })
    .trim()
    .min(10, { message: "Message must be at least 10 characters." })
    .max(2000, { message: "Message must be 2000 characters or fewer." }),
});

/** Shape *after* parsing (trimmed/normalised) — what the API route writes. */
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
/** Shape *before* parsing — what react-hook-form holds in its field state. */
export type CreateLeadFormValues = z.input<typeof createLeadSchema>;

// --- Update (admin status toggle) ------------------------------------------

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES, { message: "Invalid status." }),
});

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// --- List / search query params --------------------------------------------

/**
 * Parses the `GET /api/leads` query string. Everything arrives as a string (or
 * missing), so each field is coerced and clamped here rather than trusted.
 */
export const listLeadsQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  // "" means "no filter" — the admin UI sends an empty value for "All".
  status: z
    .union([z.enum(LEAD_STATUSES), z.literal("")])
    .optional()
    .default(""),
  // Offset pagination. `take` is capped so a caller can't ask for the world.
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

/** Default page size for the admin table, shared by client and server. */
export const LEADS_PAGE_SIZE = 25;
