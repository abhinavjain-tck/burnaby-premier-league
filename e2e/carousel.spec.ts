import { expect, test, type Page } from "@playwright/test";
import { adminSession, db, seedTestAuction } from "./helpers";

// Set SCREENS=1 to also save screenshots into docs/screens/.
const shot = async (page: Page, name: string) => {
  if (process.env.SCREENS) await page.screenshot({ path: `docs/screens/${name}.png` });
};

const TEAMS = [
  { name: "Royals", short: "RYL", colour: "#7c1bd6" },
  { name: "Kings", short: "KNG", colour: "#b91c1c" },
  { name: "Titans", short: "TTN", colour: "#15803d" },
  { name: "Strikers", short: "STR", colour: "#1d4ed8" },
];
const LOTS: Array<{ name: string; role: string; tier: string; stats?: Record<string, number | string> }> = [
  { name: "Sam Star", role: "batter", tier: "M", stats: { matches: 20, runs: 610 } },
  { name: "Nik Next", role: "bowler", tier: "B", stats: { matches: 14, wickets: 22, best: "4/18" } },
  { name: "Oli Third", role: "wicket_keeper", tier: "A", stats: { matches: 31, runs: 820 } },
  { name: "Pat Fourth", role: "all_rounder", tier: "C" },
  { name: "Raj Fifth", role: "batter", tier: "C" },
];

const lotId = async (auctionId: string, name: string) =>
  (await db<{ id: string }[]>`select id from auction_lots where auction_id = ${auctionId} and player_name = ${name}`)[0].id;

/** Sell the lot on the block to whoever leads, through the confirm sheet and the 2 s cancel window. */
async function sellToLeader(page: Page) {
  await page.getByRole("button", { name: /^SOLD ·/ }).click();
  await page.getByRole("dialog", { name: "Confirm sale" }).getByRole("button", { name: /SOLD/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Selling to" })).toBeHidden({ timeout: 10_000 });
}

/** Console with Sam Star sold to Royals and Nik Next on the block. */
async function consoleAfterASale(page: Page, name: string) {
  const { id } = await seedTestAuction(name, TEAMS, LOTS);
  await adminSession(page);
  await page.goto(`/auction/${id}/console`);
  await page.getByRole("button", { name: /Next lot: Sam Star/ }).click();
  await page.getByRole("button", { name: /Royals bids/ }).click();
  await sellToLeader(page);
  await page.getByRole("button", { name: /Next lot: Nik Next/ }).click();
  await expect(page.getByRole("button", { name: /Kings bids/ })).toBeEnabled();
  return id;
}

const carousel = (page: Page) => page.getByRole("region", { name: "Lots" });
const slide = (page: Page, name: string | RegExp) => carousel(page).getByRole("group", { name });
const backToLive = (page: Page) => page.getByRole("button", { name: "Back to live" });

test.describe("lot carousel on the console (phone)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("browsing an old lot never changes which lot gets the bid", async ({ page }) => {
    const id = await consoleAfterASale(page, "E2E Carousel Console");
    const nik = await lotId(id, "Nik Next");

    // Starts on live, no Back to live.
    await expect(slide(page, "Live")).toBeInViewport({ ratio: 0.9 });
    await expect(slide(page, "Live")).toContainText("Nik Next");
    await expect(backToLive(page)).toBeHidden();
    await expect(page.getByText("Bidding: Nik Next")).toBeVisible();
    const kings = page.getByRole("button", { name: /Kings bids/ });
    const kingsTop = async () => (await kings.evaluate((el) => el.getBoundingClientRect().top + window.scrollY));
    const kingsBefore = await kingsTop();

    // Arrow back to the previous lot: its result shows.
    await page.getByRole("button", { name: "Show earlier card" }).click();
    const prev = slide(page, "Previous: Sam Star");
    await expect(prev).toBeInViewport({ ratio: 0.9 });
    await expect(prev).toContainText("Sold");
    await expect(prev).toContainText("RYL");
    await expect(backToLive(page)).toBeVisible();
    // Back to live sits in the carousel row, well above the bid buttons, and the bid buttons didn't move.
    const back = (await backToLive(page).boundingBox())!;
    expect(back.height).toBeGreaterThanOrEqual(44);
    expect(back.y + back.height).toBeLessThan((await kings.boundingBox())!.y);
    expect(await kingsTop()).toBe(kingsBefore);
    await carousel(page).scrollIntoViewIfNeeded();
    await shot(page, "carousel-console-prev-375");

    // A bid while looking at Sam Star goes to Nik Next, the live lot. And a bid doesn't yank the view.
    await expect(page.getByText("Bidding: Nik Next")).toBeVisible();
    await page.getByRole("button", { name: /Kings bids/ }).click();
    await expect(page.getByRole("button", { name: /^SOLD · KNG/ })).toBeVisible();
    const [bid] = await db<{ payload: { lotId: string } }[]>`
      select payload from auction_events where auction_id = ${id} and type = 'BID' order by seq desc limit 1`;
    expect(bid.payload.lotId).toBe(nik);
    await expect(prev).toBeInViewport({ ratio: 0.9 });
    await expect(backToLive(page)).toBeVisible();

    // Back to live works.
    await backToLive(page).click();
    await expect(slide(page, "Live")).toBeInViewport({ ratio: 0.9 });
    await expect(backToLive(page)).toBeHidden();

    // Keyboard: right arrow goes to the next lots, in running order.
    await carousel(page).getByRole("group", { name: /Swipe or use arrow keys/ }).focus();
    // (The live card grew with the bid, as it always has; browsing to Next must not move anything.)
    const kingsOnLive = await kingsTop();
    await page.keyboard.press("ArrowRight");
    const next = slide(page, "Next up");
    await expect(next).toBeInViewport({ ratio: 0.5 });
    expect(await kingsTop()).toBe(kingsOnLive);
    await expect(next.getByRole("listitem").first()).toContainText("Oli Third");
    await expect(next.getByRole("listitem")).toHaveCount(3);
    await expect(next.getByRole("listitem").nth(1)).toContainText("Pat Fourth");

    // A sale lands while browsing: the carousel snaps back to live by itself.
    await sellToLeader(page);
    await expect(backToLive(page)).toBeHidden();
    await expect(slide(page, "Live")).toBeInViewport({ ratio: 0.9 });
    await expect(slide(page, "Live")).toContainText("Between lots");
    await expect(slide(page, "Previous: Nik Next")).toContainText("KNG");
  });
});

test.describe("lot carousel on the console (laptop)", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

  test("sits in the console column and keeps the key buttons on screen", async ({ page }) => {
    await consoleAfterASale(page, "E2E Carousel Laptop");
    await page.locator("#console").evaluate((el) => el.scrollTo(0, 0));
    await expect(page.getByRole("region", { name: "Public board" })).toBeVisible();
    await expect(page.locator("#console").getByRole("region", { name: "Lots" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Kings bids/ })).toBeInViewport();
    await expect(page.getByRole("button", { name: /^SOLD/ })).toBeInViewport();
    await shot(page, "carousel-console-1280");
  });
});

test.describe("lot carousel on the owner view", () => {
  // Tall enough to show the stats and the carousel in one screenshot. (A fullPage shot
  // resizes the page mid-capture and catches the carousel between cards.)
  test.use({ viewport: { width: 375, height: 1180 } });

  test("shows the live lot, the last result and the next lots", async ({ page }) => {
    const [royals, ...rest] = TEAMS;
    const { id } = await seedTestAuction(
      "E2E Carousel Owner",
      [{ ...royals, bought: [{ name: "Ben Bought", role: "batter", tier: "A", price: 1200 }] }, ...rest],
      LOTS,
    );
    // Put Sam Star on the block, as the console would.
    const sam = await lotId(id, "Sam Star");
    const [{ version }] = await db<{ version: number }[]>`select version from auctions where id = ${id}`;
    await db`insert into auction_events (auction_id, seq, type, payload, actor_email)
             values (${id}, ${version + 1}, 'START_LOT', ${db.json({ lotId: sam })}, 'e2e@example.com')`;
    await db`update auctions set version = ${version + 1} where id = ${id}`;

    await adminSession(page);
    await page.goto(`/auction/${id}/owner`);
    await expect(page.getByText("Purse left")).toBeVisible();
    await expect(slide(page, "Live")).toContainText("Sam Star");
    await expect(slide(page, "Previous: Ben Bought")).toContainText("RYL");
    const next = slide(page, "Next up");
    await expect(next.getByRole("listitem")).toHaveCount(3);
    await expect(next.getByRole("listitem").first()).toContainText("Nik Next");
    // The old "Coming up" list is gone: the carousel shows it.
    await expect(page.getByRole("heading", { name: "Coming up" })).toHaveCount(0);
    await shot(page, "carousel-owner-375");
  });
});
