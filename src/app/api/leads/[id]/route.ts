import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/api-auth";
import { leadListSelect } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { updateLeadSchema } from "@/lib/validation/lead";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/leads/:id — move a lead through NEW → CONTACTED → CLOSED.
 *
 * Protected. Accepts nothing but `{ status }`: the admin UI has no business
 * rewriting a lead's name or message, so those fields are not even readable
 * from the payload.
 *
 * Note `params` is a Promise — Next.js 16 removed synchronous access to
 * route params.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status: parsed.data.status },
      select: leadListSelect,
    });

    return NextResponse.json(lead, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // P2025 = "record to update not found". That's a client mistake (404),
    // not a server fault, so it gets its own branch.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    console.error(`[PATCH /api/leads/${id}] Failed to update lead:`, error);
    return NextResponse.json(
      { error: "Could not update this lead." },
      { status: 500 },
    );
  }
}
