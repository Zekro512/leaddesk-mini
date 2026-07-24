import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * TEMPORARY DIAGNOSTIC ENDPOINT — delete once the deployment is healthy.
 *
 * Reports whether the required environment variables are present and whether
 * the database is reachable. It deliberately never echoes a secret: the
 * password is reduced to a length and a "is it percent-encoded" flag, and
 * NEXTAUTH_SECRET to a boolean.
 */
export const dynamic = "force-dynamic";

function describeDatabaseUrl(raw: string | undefined) {
  if (!raw) return { set: false as const };

  // Catch the two most common paste mistakes before trying to parse.
  const wrappedInQuotes = /^["'].*["']$/.test(raw);
  const hasWhitespace = raw !== raw.trim();

  let parsed;
  try {
    parsed = new URL(raw.trim().replace(/^["']|["']$/g, ""));
  } catch {
    return {
      set: true as const,
      parseable: false as const,
      wrappedInQuotes,
      hasWhitespace,
      startsWith: raw.slice(0, 12),
    };
  }

  return {
    set: true as const,
    parseable: true as const,
    wrappedInQuotes,
    hasWhitespace,
    protocol: parsed.protocol,
    host: parsed.hostname,
    port: parsed.port,
    username: parsed.username,
    // Never the value itself — just enough to spot an unencoded "@".
    passwordLength: parsed.password.length,
    passwordIsPercentEncoded: parsed.password.includes("%"),
    search: parsed.search,
    usesPooler: parsed.hostname.includes("pooler.supabase.com"),
    isDirectIpv6Host: /^db\..*\.supabase\.co$/.test(parsed.hostname),
  };
}

export async function GET() {
  const env = {
    DATABASE_URL: describeDatabaseUrl(process.env.DATABASE_URL),
    DIRECT_URL: describeDatabaseUrl(process.env.DIRECT_URL),
    NEXTAUTH_SECRET_set: Boolean(
      process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    ),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
  };

  let database: Record<string, unknown>;
  try {
    const [{ ok }] = await prisma.$queryRaw<
      Array<{ ok: number }>
    >`SELECT 1 as ok`;
    const leads = await prisma.lead.count();
    const admins = await prisma.adminUser.count();
    database = { connected: ok === 1, leads, admins };
  } catch (error) {
    database = {
      connected: false,
      // Prisma's message names the actual cause (auth failure, DNS, timeout).
      // Safe to surface here because it never contains the password.
      name: error instanceof Error ? error.name : "Unknown",
      code: (error as { code?: string })?.code ?? null,
      message:
        error instanceof Error
          ? error.message.split("\n").slice(0, 4).join(" ").slice(0, 400)
          : String(error),
    };
  }

  return NextResponse.json(
    { env, database },
    { headers: { "Cache-Control": "no-store" } },
  );
}
