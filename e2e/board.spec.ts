import { expect, test } from "@playwright/test";
import { seedTestAuction, TINY_PNG, uploadPhoto } from "./helpers";

test("board: team card shows the captain and opens the squad", async ({ page }) => {
  const photo = await uploadPhoto("e2e/captain.png", TINY_PNG);
  const { token } = await seedTestAuction("E2E Board Squads", [
    {
      name: "Strikers",
      short: "STR",
      colour: "#1d4ed8",
      captain: { name: "Casey Captain", role: "all_rounder", tier: "M", photoUrl: photo },
      bought: [{ name: "Bobby Buyer", role: "wicket_keeper", tier: "B", price: 650, stats: { matches: 12, runs: 240 } }],
    },
    { name: "Kings", short: "KNG", colour: "#b91c1c" },
  ]);

  await page.goto(`/auction/t/${token}`);
  const card = page.getByRole("button", { name: /^Strikers: .*captain Casey Captain.*Show squad/ });
  await expect(card).toBeVisible();
  // Team without a captain: no captain text, card still opens.
  await expect(page.getByRole("button", { name: /^Kings: / })).not.toHaveAccessibleName(/captain/);

  await card.click();
  const sheet = page.getByRole("dialog", { name: "Strikers" });
  await expect(sheet).toBeVisible();
  const rows = sheet.getByRole("list", { name: "Strikers players" }).getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Casey Captain");
  await expect(rows.first()).toContainText("Captain");
  await expect(rows.nth(1)).toContainText("Bobby Buyer");
  await expect(rows.nth(1)).toContainText("6.5 cr");
  await expect(sheet.getByText("2/13")).toBeVisible();

  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
  await expect(card).toBeFocused();

  // Escape closes too.
  await card.click();
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});
