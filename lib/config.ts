/**
 * Which services are wired up. Pages check these and show a
 * "Not configured yet" notice instead of crashing when env vars are missing.
 * NEXT_PUBLIC_* values are read as literals so Next can inline them in the browser.
 */
export class NotConfiguredError extends Error {
  constructor(readonly missing: string) {
    super(`Not configured yet: ${missing} is not set`);
    this.name = "NotConfiguredError";
  }
}

export const isDbConfigured = (): boolean => Boolean(process.env.DATABASE_URL);

export const isSupabaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Uploads need the service role key to mint signed upload URLs. */
export const isStorageConfigured = (): boolean =>
  isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
