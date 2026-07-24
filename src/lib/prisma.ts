import { PrismaClient } from "@prisma/client";

/**
 * Same whitespace guard as `auth.config.ts`, for the database URLs. Prisma
 * resolves `env("DATABASE_URL")` itself when the client is constructed, so
 * this has to run first. A pasted leading tab otherwise produces an opaque
 * PrismaClientInitializationError with no hint as to the real cause.
 */
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const value = process.env[key];
  if (value && value !== value.trim()) {
    process.env[key] = value.trim();
  }
}

/**
 * Prisma client singleton.
 *
 * Next.js hot-reloads server modules in development, which would otherwise
 * create a brand-new PrismaClient (and a new connection pool) on every edit
 * until Postgres refuses new connections. Stashing the instance on `globalThis`
 * survives the reload. In production the module is evaluated once per lambda,
 * so the global is never touched.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
