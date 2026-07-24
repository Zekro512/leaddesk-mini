import type { BudgetRange, LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  BUDGET_RANGES,
  LEAD_STATUSES,
  type BudgetRangeValue,
  type LeadStatusValue,
  type ListLeadsQuery,
} from "@/lib/validation/lead";

/**
 * Compile-time guard: the literal unions in `lib/validation/lead.ts` are
 * hand-maintained (they must not pull `@prisma/client` into the client
 * bundle), so these two assignments exist purely to make `tsc` fail if the
 * Prisma enums and the Zod enums ever drift apart. They cost nothing at
 * runtime beyond two small object literals.
 */
const _budgetRangesMatchPrisma: Record<BudgetRange, BudgetRangeValue> = {
  UNDER_1K: "UNDER_1K",
  FROM_1K_TO_5K: "FROM_1K_TO_5K",
  FROM_5K_TO_20K: "FROM_5K_TO_20K",
  OVER_20K: "OVER_20K",
};
const _leadStatusesMatchPrisma: Record<LeadStatus, LeadStatusValue> = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  CLOSED: "CLOSED",
};
void _budgetRangesMatchPrisma;
void _leadStatusesMatchPrisma;

// Re-exported so the reverse direction is checked too: if Prisma ever drops a
// member, these arrays would no longer satisfy the Prisma enum type.
void (BUDGET_RANGES satisfies readonly BudgetRange[]);
void (LEAD_STATUSES satisfies readonly LeadStatus[]);

/** The columns the admin table needs. Keeps the payload predictable. */
export const leadListSelect = {
  id: true,
  name: true,
  email: true,
  budgetRange: true,
  message: true,
  status: true,
  createdAt: true,
} satisfies Prisma.LeadSelect;

export type LeadListItem = Prisma.LeadGetPayload<{
  select: typeof leadListSelect;
}>;

/**
 * Translates validated query params into a Prisma `where` clause.
 *
 * `mode: "insensitive"` maps to Postgres ILIKE, so "ACME" finds "acme@x.com".
 * Note this makes the `email` btree index unusable for the search path — at
 * this scale that's the right trade (a trigram index would be the next step if
 * the table grows past a few hundred thousand rows).
 */
export function buildLeadWhere(query: ListLeadsQuery): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

/**
 * Fetches one page of leads plus the total match count, so the UI can show
 * "showing 25 of 112" and decide whether a "Load more" button is needed.
 * Both queries run in a single round trip.
 */
export async function findLeads(query: ListLeadsQuery) {
  const where = buildLeadWhere(query);

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      select: leadListSelect,
      // Newest first is the default the brief asks for; `id` is a stable
      // tiebreaker so rows can't shuffle between pages when timestamps collide.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: query.skip,
      take: query.take,
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total };
}
