import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var hostelPgPool: Pool | undefined;
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Copy .env.example to .env.local and set it.");
  }

  if (!global.hostelPgPool) {
    global.hostelPgPool = new Pool({
      connectionString,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return global.hostelPgPool;
}
