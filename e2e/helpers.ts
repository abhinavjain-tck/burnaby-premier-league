import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import postgres from "postgres";

export const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAILS?.split(",")[0]?.trim() || "e2e-admin@example.com";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Create .env.e2e (see README, "Local development and e2e").`);
  return v;
}

/** Direct DB access. Shared across tests in a worker. */
export const db = postgres(env("DATABASE_URL"), { max: 2, onnotice: () => {} });

export type RegistrationRow = {
  id: string;
  edit_token: string;
  status: string;
  full_name: string;
  phone: string;
  role: string | null;
  bio: string | null;
  tier: string | null;
  paid_at: Date | null;
};

/** Wipe registrations and put the season config back to the seed default. Seasons, teams and sponsors stay. */
export async function resetState() {
  await db`truncate table player_registrations cascade`;
  await db`update seasons set config = '{}'::jsonb where id = 1`;
}

export async function registrations(): Promise<RegistrationRow[]> {
  return db<RegistrationRow[]>`select * from player_registrations order by created_at`;
}

function serviceClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const MAX_CHUNK = 3180; // same as @supabase/ssr

/**
 * Sign in the e2e admin without Google. Creates the user and a super_admin
 * row, mints a magic link with the admin API, redeems it, and stores the
 * resulting session in the cookie format @supabase/ssr reads.
 */
export async function adminSession(page: Page) {
  const admin = serviceClient();

  const created = await admin.auth.admin.createUser({ email: ADMIN_EMAIL, email_confirm: true });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) throw created.error;

  await db`insert into user_roles (email, role) values (${ADMIN_EMAIL}, 'super_admin')
           on conflict (email) do update set role = 'super_admin'`;

  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: ADMIN_EMAIL });
  if (error || !link.properties) throw error ?? new Error("generateLink returned no properties");

  // Redeem the link's token server-side. Following action_link in the browser would hand
  // the session back in the URL hash, which this cookie-based app never reads.
  const verifier = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: verifyError } = await verifier.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError || !verified.session) throw verifyError ?? new Error("verifyOtp returned no session");

  const ref = new URL(env("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(verified.session)).toString("base64url");
  const parts = value.length <= MAX_CHUNK ? [value] : value.match(new RegExp(`.{1,${MAX_CHUNK}}`, "g"))!;
  await page.context().addCookies(
    parts.map((part, i) => ({
      name: parts.length === 1 ? name : `${name}.${i}`,
      value: part,
      domain: "localhost",
      path: "/",
    })),
  );
}
