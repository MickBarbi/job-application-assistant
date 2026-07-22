/**
 * Prisma client singleton.
 *
 * Next.js hot-reloading in development creates many module instances; without a
 * global cache this would exhaust the database connection pool. In production a
 * single instance is created per server process.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
