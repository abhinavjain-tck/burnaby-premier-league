import { expect, test, type Page } from "@playwright/test";
import { registrations, resetState } from "./helpers";

test.beforeEach(resetState);

async function fillAndSubmit(page: Page, name: string, phone: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("WhatsApp number").fill(phone);
  await page.getByText("All-rounder").click();
  await page.getByText("Right-hand bat").click();
  await page.getByText("Right-arm spin").click();
  await page.getByRole("button", { name: "Register" }).click();
}

test("register, land on the private page, then edit", async ({ page }) => {
  await fillAndSubmit(page, "Test Player", "604 555 0101");

  await expect(page).toHaveURL(/\/r\/[A-Za-z0-9_-]{20}\?new=1$/);
  await expect(page.getByRole("heading", { name: "You're in the pool" })).toBeVisible();
  await expect(page.getByText("Test Player").first()).toBeVisible();

  const rows = await registrations();
  expect(rows).toHaveLength(1);
  expect(rows[0].phone).toBe("16045550101");
  expect(rows[0].status).toBe("registered");
  expect(page.url()).toContain(rows[0].edit_token);

  // Edit: the card step is open on the edit page.
  await page.getByLabel("One line about you").fill("Left-arm spinner, loves a chase");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Left-arm spinner, loves a chase").first()).toBeVisible();
  expect((await registrations())[0].bio).toBe("Left-arm spinner, loves a chase");
});

test("same phone twice shows Already registered", async ({ page }) => {
  await fillAndSubmit(page, "First Player", "604 555 0101");
  await expect(page).toHaveURL(/\/r\//);

  await fillAndSubmit(page, "Second Player", "+1 (604) 555-0101");
  await expect(page.getByText("Already registered")).toBeVisible();
  expect(await registrations()).toHaveLength(1);
});

test("invalid edit token is a 404", async ({ page }) => {
  const res = await page.goto("/r/aaaaaaaaaaaaaaaaaaaa");
  expect(res?.status()).toBe(404);
  const bad = await page.goto("/r/short");
  expect(bad?.status()).toBe(404);
});
