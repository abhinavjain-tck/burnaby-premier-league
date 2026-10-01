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
  // Not `truncate ... cascade` on registrations: teams point at their captain, so that would wipe teams too.
  await db`truncate table auction_lots`;
  await db`delete from player_registrations`; // captain links go null (on delete set null)
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
export async function adminSession(page: Page, email = ADMIN_EMAIL, role: "admin" | "super_admin" = "super_admin") {
  const admin = serviceClient();

  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) throw created.error;

  await db`insert into user_roles (email, role) values (${email}, ${role})
           on conflict (email) do update set role = ${role}`;

  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
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

/** Put a file in the public photos bucket and return its public URL. */
export async function uploadPhoto(path: string, body: Buffer, contentType = "image/png"): Promise<string> {
  const storage = serviceClient().storage.from("photos");
  const { error } = await storage.upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

/** 8x8 pitch-green PNG, enough to prove a photo renders. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGPg9tXBihiGlgQA3TwhAcpzi+YAAAAASUVORK5CYII=",
  "base64",
);

type SeedLot = { name: string; role: string; tier: string; photoUrl?: string | null; stats?: Record<string, number | string> };
type SeedTeam = { name: string; short: string; colour: string; captain?: SeedLot; bought?: Array<SeedLot & { price: number }> };

/**
 * A test auction built straight in the DB: teams, lots and an event log
 * (captains pre-sold, some players sold). The board replays the log, so it
 * sees exactly what the console would have made. Returns the share token.
 */
export async function seedTestAuction(name: string, teams: SeedTeam[], extra: SeedLot[] = []): Promise<{ id: string; token: string }> {
  // Clear an earlier run of the same auction.
  const old = await db<{ id: string }[]>`select id from auctions where name = ${name}`;
  for (const { id } of old) {
    await db`delete from auction_events where auction_id = ${id}`;
    await db`delete from auction_lots where auction_id = ${id}`;
    await db`delete from auction_teams where auction_id = ${id}`;
    await db`delete from auction_admins where auction_id = ${id}`;
    await db`delete from auctions where id = ${id}`;
  }

  const token = (name.replace(/[^A-Za-z0-9]/g, "") + "00000000000000000000").slice(0, 20);
  const [auction] = await db<{ id: string }[]>`
    insert into auctions (season_id, name, mode, status, share_token)
    values (1, ${name}, 'test', 'open', ${token}) returning id`;

  const events: Array<{ type: string; payload: Record<string, string | number> }> = [];
  let order = 0;
  const addLot = async (l: SeedLot) => {
    const card = { battingStyle: "Right-hand bat", bowlingStyle: null, stats: l.stats ?? {} };
    const [row] = await db<{ id: string }[]>`
      insert into auction_lots (auction_id, player_name, role, tier, photo_url, card, set_name, sort_order, base_lakhs)
      values (${auction.id}, ${l.name}, ${l.role}, ${l.tier}, ${l.photoUrl ?? null}, ${db.json(card)}, 'Batters', ${++order}, 500)
      returning id`;
    return row.id;
  };

  for (const t of teams) {
    const [team] = await db<{ id: string }[]>`
      insert into auction_teams (auction_id, name, short, colour, purse_start_lakhs, purse_left_lakhs)
      values (${auction.id}, ${t.name}, ${t.short}, ${t.colour}, 30000, 30000) returning id`;
    if (t.captain) events.push({ type: "PRESOLD", payload: { lotId: await addLot(t.captain), teamId: team.id, amount: 2500 } });
    for (const b of t.bought ?? []) {
      const lotId = await addLot(b);
      events.push({ type: "START_LOT", payload: { lotId } }, { type: "SOLD", payload: { lotId, teamId: team.id, amount: b.price } });
    }
  }
  for (const l of extra) await addLot(l);

  // Pre-sales first, then open, then the sales in order.
  const ordered = [...events.filter((e) => e.type === "PRESOLD"), { type: "START", payload: {} }, ...events.filter((e) => e.type !== "PRESOLD")];
  for (const [i, e] of ordered.entries()) {
    await db`insert into auction_events (auction_id, seq, type, payload, actor_email)
             values (${auction.id}, ${i + 1}, ${e.type}, ${db.json(e.payload)}, 'e2e@example.com')`;
  }
  await db`update auctions set version = ${ordered.length} where id = ${auction.id}`;
  return { id: auction.id, token };
}
