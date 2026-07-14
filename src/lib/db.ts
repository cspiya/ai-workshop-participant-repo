import { PrismaClient } from "@prisma/client";

// Prisma client singleton — safe for Next.js dev hot-reload, which otherwise
// creates a new client on every module reload and exhausts DB connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
