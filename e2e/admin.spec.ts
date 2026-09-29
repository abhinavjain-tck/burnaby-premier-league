import { expect, test } from "@playwright/test";
import { adminSession, db, registrations, resetState } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetState();
  await adminSession(page);
});

async function seedPlayer() {
  await db`insert into player_registrations (season_id, edit_token, full_name, phone, role)
           values (1, 'e2eSeedToken0000000ab', 'Admin Test Player', '16045550199', 'batter')`;
}

test("registration detail: mark paid and set tier", async ({ page }) => {
  await seedPlayer();
  await page.goto("/admin/registrations");
  await page.getByRole("link", { name: /Admin Test Player/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/registrations\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByRole("button", { name: "Mark paid" })).toHaveCount(0);
  await expect.poll(async () => (await registrations())[0].status).toBe("confirmed");
  expect((await registrations())[0].paid_at).not.toBeNull();

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.getByRole("button", { name: "A", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await registrations())[0].tier).toBe("A");
});

test("settings: fee text shows on /register, closing hides the form", async ({ page }) => {
  const save = async () => {
    await page.getByRole("button", { name: "Save league settings" }).click();
    await expect(page.getByText("League settings saved.")).toBeVisible();
  };

  await page.goto("/admin/settings");
  await page.getByLabel("Fee line").fill("$60 per player");
  await save();

  await page.goto("/register");
  await page.getByRole("button", { name: /League fee/ }).click();
  await expect(page.getByText("$60 per player")).toBeVisible();

  await page.goto("/admin/settings");
  await page.getByLabel("Registration is open").uncheck();
  await save();
  await page.goto("/register");
  await expect(page.getByText("Registration is closed for this season.")).toBeVisible();

  await page.goto("/admin/settings");
  await page.getByLabel("Registration is open").check();
  await save();
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Register", exact: true })).toBeVisible();
});
