import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { NotConfiguredError } from "../config";
import * as schema from "./schema";

export { NotConfiguredError };

export type Db = PostgresJsDatabase<typeof schema>;

// Reuse one client across hot reloads in dev so we don't leak connections.
const globalForDb = globalThis as unknown as { bplDb?: Db };

/**
 * Service-role Drizzle connection. Bypasses RLS, so only call it from
 * server code that has already checked who is asking.
 * Throws NotConfiguredError when DATABASE_URL is missing.
 */
export function getDb(): Db {
  if (globalForDb.bplDb) return globalForDb.bplDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new NotConfiguredError("DATABASE_URL");
  // prepare: false because the Supabase transaction pooler (port 6543) does not support prepared statements.
  const client = postgres(url, { prepare: false, max: 5 });
  globalForDb.bplDb = drizzle(client, { schema });
  return globalForDb.bplDb;
}

/** Postgres unique-violation check that works whether or not Drizzle wraps the error. */
export function isUniqueViolation(err: unknown): boolean {
  const code = (e: unknown) => (e as { code?: string } | null)?.code;
  return code(err) === "23505" || code((err as { cause?: unknown } | null)?.cause) === "23505";
}
