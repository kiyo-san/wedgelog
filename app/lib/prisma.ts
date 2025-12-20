import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaUrl =
  process.env.NEON_CONNECTION_STRING ?? process.env.DATABASE_URL ?? "";

declare global {
  // eslint-disable-next-line no-var
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

function makePrismaClient() {
  if (!prismaUrl) {
    throw new Error(
      "Missing NEON_CONNECTION_STRING or DATABASE_URL (required to connect to Postgres).",
    );
  }

  const pool = new Pool({ connectionString: prismaUrl });
  const adapter = new PrismaPg(pool);

  // Prisma 7 requires an adapter (direct DB) or accelerateUrl.
  return new PrismaClient({ adapter });
}

export const prisma =
  global.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;


