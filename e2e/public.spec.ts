import { expect, test } from "@playwright/test";

test("home shows the title sponsor placeholder and a Register link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BPL Season 4" })).toBeVisible();
  await expect(page.getByText("Title Sponsor (placeholder)").first()).toBeVisible();
  await page.getByRole("link", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test("/admin without a session offers Google sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});
