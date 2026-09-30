import { expect, test, type Page } from "@playwright/test";
import { adminSession, db, seedTestAuction } from "./helpers";

// Set SCREENS=1 to also save screenshots into docs/screens/.
const shot = async (page: Page, name: string) => {
  if (process.env.SCREENS) await page.screenshot({ path: `docs/screens/${name}.png` });
};

/** A fresh test auction with four teams (two of them close purples) and a Star lot waiting. */
async function openConsole(page: Page) {
  const { id } = await seedTestAuction(
    "E2E Console Board",
    [
      { name: "Royals", short: "RYL", colour: "#7c1bd6" },
      { name: "Kings", short: "KNG", colour: "#b91c1c" },
      { name: "Titans", short: "TTN", colour: "#15803d" },
      { name: "Strikers", short: "STR", colour: "#6d28d9" },
    ],
    [
      { name: "Sam Star", role: "batter", tier: "M", stats: { matches: 20, runs: 610 } },
      { name: "Nik Next", role: "bowler", tier: "B" },
    ],
  );
  // The top set is stored as "Marquee"; people should only ever see "Star".
  await db`update auction_lots set set_name = 'Marquee' where auction_id = ${id} and player_name = 'Sam Star'`;
  await adminSession(page);
  await page.goto(`/auction/${id}/console`);
  await page.getByRole("button", { name: /Next lot: Sam Star/ }).click();
  await expect(page.getByRole("button", { name: /Royals bids/ })).toBeEnabled();
}

test.describe("console on a laptop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

  test("shows the board next to the console, both live off the same state", async ({ page }) => {
    await openConsole(page);
    const board = page.getByRole("region", { name: "Public board" });
    await expect(board).toBeVisible();
    await expect(page.getByRole("tablist")).toBeHidden();

    const consoleLot = page.locator("#console").getByRole("article", { name: /Sam Star/ });
    await expect(consoleLot).toContainText("Star");
    await expect(consoleLot).not.toContainText(/marquee/i);

    // A bid on the console shows on the board straight away.
    await page.getByRole("button", { name: /Royals bids/ }).click();
    const onBlock = board.getByRole("region", { name: "On the block" });
    await expect(onBlock).toContainText("Royals");
    await expect(onBlock).toContainText("Leads");

    // The buttons the operator needs most fit on a 1280x800 laptop without scrolling.
    await expect(page.getByRole("button", { name: /Kings bids/ })).toBeInViewport();
    await expect(page.getByRole("button", { name: /^SOLD/ })).toBeInViewport();

    // Look-alike purples: the later team gets a clearly different colour.
    const bg = (name: RegExp) => page.getByRole("button", { name }).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await bg(/Royals bids/)).not.toBe(await bg(/Strikers bids/));
    await shot(page, "console-board-1280");
  });
});

test.describe("console on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("flips between Console and Board", async ({ page }) => {
    await openConsole(page);
    const consoleTab = page.getByRole("tab", { name: "Console" });
    const boardTab = page.getByRole("tab", { name: "Board" });
    const board = page.getByRole("region", { name: "Public board" });

    await expect(consoleTab).toHaveAttribute("aria-selected", "true");
    await expect(board).toBeHidden();
    await page.getByRole("button", { name: /Kings bids/ }).click();

    await boardTab.click();
    await expect(boardTab).toHaveAttribute("aria-selected", "true");
    await expect(board).toBeVisible();
    await expect(board.getByRole("region", { name: "On the block" })).toContainText("Kings");
    await expect(page.getByRole("button", { name: /^SOLD/ })).toBeHidden();
    // The toggle stays put and big enough to hit.
    const box = await boardTab.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await shot(page, "console-board-toggle-375");

    await consoleTab.click();
    await expect(page.getByRole("button", { name: /^SOLD/ })).toBeVisible();
    await expect(board).toBeHidden();
  });
});
