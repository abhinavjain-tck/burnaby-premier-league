import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { adminSession, db, resetState } from "./helpers";

// Set SCREENS=1 to also save screenshots into docs/screens/.
async function shot(page: Page, name: string, fullPage = false) {
  if (!process.env.SCREENS) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // dev-only badge
  await page.screenshot({ path: `docs/screens/${name}.png`, fullPage });
}

const MIGRATION = "supabase/migrations/20261001051900_season4_teams_players.sql";
const AUCTION = "E2E Season 4 rehearsal";

/** Other specs wipe registrations, so put the organiser's data back. Also proves the migration re-runs cleanly. */
async function seedSeason4() {
  await resetState();
  await db.unsafe(readFileSync(MIGRATION, "utf8"));
  for (const { id } of await db<{ id: string }[]>`select id from auctions where name = ${AUCTION}`) {
    await db`delete from auction_events where auction_id = ${id}`;
    await db`delete from auction_lots where auction_id = ${id}`;
    await db`delete from auction_teams where auction_id = ${id}`;
    await db`delete from auction_admins where auction_id = ${id}`;
    await db`delete from auctions where id = ${id}`;
  }
}

test.beforeEach(async ({ page }) => {
  await seedSeason4();
  await adminSession(page);
  await page.setViewportSize({ width: 375, height: 812 });
});

test("season 4 data: real teams, captains, 44 paid players", async () => {
  const teams = await db<{ name: string; logo_url: string; captain: string }[]>`
    select t.name, t.logo_url, p.full_name as captain
    from teams t join player_registrations p on p.id = t.captain_registration_id
    where t.season_id = 1 order by t.name`;
  expect(teams.map((t) => [t.name, t.captain])).toEqual([
    ["Burnaby Hawks", "Deepak"],
    ["Burnaby Hunters", "Vivek"],
    ["Burnaby Panthers", "Prasad"],
    ["Burnaby Tigers", "Karanveer Singh"],
  ]);
  expect(teams.every((t) => /^\/teams\/\w+\.webp$/.test(t.logo_url))).toBe(true);

  const [counts] = await db<{ all: number; paid: number; placeholders: number; pending: number }[]>`
    select count(*)::int as all, count(paid_at)::int as paid,
           count(*) filter (where phone like 'placeholder-%')::int as placeholders,
           count(*) filter (where phone like 'pending-%')::int as pending
    from player_registrations where season_id = 1 and status = 'confirmed'`;
  expect(counts).toEqual({ all: 44, paid: 44, placeholders: 8, pending: 36 });

  const roles = await db<{ full_name: string; role: string | null; batting_style: string | null; bio: string | null }[]>`
    select full_name, role, batting_style, bio from player_registrations
    where full_name in ('Axar Patel', 'Bharatt Mistry', 'Prit Diyora', 'Deepak', 'Hemant Gandhi') order by full_name`;
  expect(roles).toEqual([
    { full_name: "Axar Patel", role: "batter", batting_style: "Left-hand bat", bio: null },
    { full_name: "Bharatt Mistry", role: "all_rounder", batting_style: null, bio: "Also keeps wicket." },
    { full_name: "Deepak", role: null, batting_style: null, bio: null },
    { full_name: "Hemant Gandhi", role: "all_rounder", batting_style: null, bio: "Bowling all-rounder." },
    { full_name: "Prit Diyora", role: "wicket_keeper", batting_style: null, bio: null },
  ]);

  const [season] = await db<{ purse_lakhs: number }[]>`select purse_lakhs from seasons where id = 1`;
  expect(season.purse_lakhs).toBe(25000);
});

test("home: event card", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "Event" });
  await expect(card).toContainText("Sunday 4 Oct 2026, 11:30 AM");
  await expect(card).toContainText("Oct 11, 18 & 25");
  await expect(card).toContainText("3860 Sperling Ave");
  await expect(card).toContainText("burnabyfalcons@gmail.com");
  await expect(card).toContainText("First 44 players");
  await card.scrollIntoViewIfNeeded();
  await shot(page, "home-event-375");
});

test("admin: captains and placeholders are flagged, pool excludes captains, phone can be filled in", async ({ page }) => {
  await page.goto("/admin/registrations");
  await expect(page.getByText(/40 in the auction pool/)).toBeVisible();
  await expect(page.getByText(/Captain · Burnaby/).filter({ visible: true })).toHaveCount(4);
  await expect(page.getByText("Placeholder", { exact: true }).filter({ visible: true })).toHaveCount(8);
  await shot(page, "admin-registrations-seeded-375");

  await page.getByRole("link", { name: /Deepak/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/registrations\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Captain · Burnaby Hawks")).toBeVisible();
  await expect(page.getByText("No phone yet")).toBeVisible();
  await expect(page.getByText(/^\/r\/[A-Za-z0-9_-]{20}$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();

  await page.getByLabel("Add WhatsApp number").fill("(604) 555-0142");
  await page.getByRole("button", { name: "Save phone" }).click();
  await expect(page.getByText("Phone saved.")).toBeVisible();
  const [deepak] = await db<{ phone: string }[]>`select phone from player_registrations where full_name = 'Deepak'`;
  expect(deepak.phone).toBe("16045550142");

  // Same number on another player is refused, like the public form.
  await page.goto("/admin/registrations");
  await page.getByRole("link", { name: /Prasad/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/registrations\/[0-9a-f-]{36}$/);
  await page.getByLabel("Add WhatsApp number").fill("604 555 0142");
  await page.getByRole("button", { name: "Save phone" }).click();
  await expect(page.getByText("Deepak already has this number.")).toBeVisible();
});

test("auction: seeding puts captains on their teams free; the board shows logos and captains", async ({ page }) => {
  await page.goto("/admin/auctions");
  await expect(page.getByLabel("Purse per team (crores)")).toHaveValue("250");
  await page.getByLabel("Name").fill(AUCTION);
  await page.getByRole("button", { name: "Create auction" }).click();
  await expect(page).toHaveURL(/\/admin\/auctions\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Add confirmed players" }).click();
  await expect(page.getByText("Added 40 confirmed players. 4 captains placed on their teams.")).toBeVisible();

  const [a] = await db<{ id: string; share_token: string }[]>`select id, share_token from auctions where name = ${AUCTION}`;
  const lots = await db<{ status: string; n: number }[]>`
    select status, count(*)::int as n from auction_lots where auction_id = ${a.id} group by status order by status`;
  expect(lots).toEqual([
    { status: "queued", n: 40 },
    { status: "sold", n: 4 },
  ]);
  const teams = await db<{ purse_left_lakhs: number; squad_size: number }[]>`
    select purse_left_lakhs, squad_size from auction_teams where auction_id = ${a.id}`;
  expect(teams).toHaveLength(4);
  expect(teams.every((t) => t.purse_left_lakhs === 25000 && t.squad_size === 1)).toBe(true);

  // Captains are on their teams, not sales.
  await page.goto(`/auction/t/${a.share_token}`);
  await expect(page.getByRole("heading", { name: /^Sold/ })).toContainText("(0)");

  // One sale straight into the log (the board replays it), so the shots show a real sale.
  const [first] = await db<{ id: string }[]>`
    select id from auction_lots where auction_id = ${a.id} and status = 'queued' order by sort_order limit 1`;
  const [tigers] = await db<{ id: string }[]>`select id from auction_teams where auction_id = ${a.id} and name = 'Burnaby Tigers'`;
  const [{ version }] = await db<{ version: number }[]>`select version from auctions where id = ${a.id}`;
  const sale = [
    { type: "START", payload: {} },
    { type: "START_LOT", payload: { lotId: first.id } },
    { type: "SOLD", payload: { lotId: first.id, teamId: tigers.id, amount: 1200 } },
  ];
  for (const [i, e] of sale.entries()) {
    await db`insert into auction_events (auction_id, seq, type, payload, actor_email)
             values (${a.id}, ${version + i + 1}, ${e.type}, ${db.json(e.payload)}, 'e2e@example.com')`;
  }
  await db`update auctions set version = ${version + sale.length}, status = 'open' where id = ${a.id}`;
  await page.reload();
  await expect(page.getByRole("heading", { name: /^Sold/ })).toContainText("(1)");
  for (const [team, captain] of [
    ["Burnaby Hawks", "Deepak"],
    ["Burnaby Panthers", "Prasad"],
    ["Burnaby Hunters", "Vivek"],
  ]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${team}: 250 cr left, 1 of 13 players, captain ${captain}`) })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /^Burnaby Tigers: 238 cr left, 2 of 13 players, captain Karanveer Singh/ })).toBeVisible();
  const purses = page.getByRole("region", { name: "Purses" });
  await expect(purses.locator('img[src^="/teams/"]')).toHaveCount(4);
  await shot(page, "board-teams-375", true);

  await page.setViewportSize({ width: 1280, height: 900 });
  await shot(page, "board-teams-1280");

  await page.getByRole("button", { name: /^Burnaby Tigers: / }).click();
  const sheet = page.getByRole("dialog", { name: "Burnaby Tigers" });
  await expect(sheet.getByRole("listitem").first()).toContainText("Karanveer Singh");
  await expect(sheet.getByRole("listitem").first()).toContainText("Captain");
});
