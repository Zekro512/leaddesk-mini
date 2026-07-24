import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/api-auth";
import { findLeads } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import {
  createLeadSchema,
  listLeadsQuerySchema,
} from "@/lib/validation/lead";

// Always hit the database — an admin inbox must never be served from a cache,
// and a lead submission is a write.
export const dynamic = "force-dynamic";

/**
 * POST /api/leads — public lead submission.
 *
 * Intentionally unauthenticated: this is the landing page form. It is the one
 * route `proxy.ts` lets through anonymously.
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  // Re-validate server-side with the SAME schema the browser used. Client
  // validation is a UX affordance; anyone can POST here directly with curl.
  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        // Field-level detail so the form can highlight the offending inputs.
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    // `parsed.data` is the *output* of the schema: already trimmed, with the
    // email lowercased. The raw request body is never written to the database.
    const lead = await prisma.lead.create({
      data: parsed.data,
      select: { id: true, createdAt: true },
    });

    return NextResponse.json(
      { id: lead.id, createdAt: lead.createdAt },
      { status: 201 },
    );
  } catch (error) {
    // Real detail to the server log, a generic message to the client — an
    // exception string can leak schema and connection details.
    console.error("[POST /api/leads] Failed to create lead:", error);
    return NextResponse.json(
      { error: "Something went wrong saving your message. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/leads?search=&status=&skip=&take= — admin list/search.
 *
 * Protected: `proxy.ts` rejects anonymous callers, and `requireSession()`
 * re-checks here so the route is safe on its own.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;

  const parsed = listLeadsQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    skip: searchParams.get("skip") ?? undefined,
    take: searchParams.get("take") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const { leads, total } = await findLeads(parsed.data);

    return NextResponse.json(
      {
        leads,
        total,
        // Lets the client decide whether to render "Load more" without
        // recomputing the arithmetic itself.
        hasMore: parsed.data.skip + leads.length < total,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[GET /api/leads] Failed to list leads:", error);
    return NextResponse.json(
      { error: "Could not load leads." },
      { status: 500 },
    );
  }
}
