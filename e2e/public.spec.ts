import { expect, test } from "@playwright/test";

test("home shows the title sponsor (The Curated Knot) and a Register link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BPL Season 4" })).toBeVisible();
  await expect(page.getByText("The Curated Knot").first()).toBeVisible();
  const ig = "https://www.instagram.com/thecuratedknot/";
  const follow = page.getByRole("link", { name: "Follow @thecuratedknot on Instagram" });
  await expect(follow.first()).toHaveAttribute("href", ig);
  await expect(follow.first()).toHaveAttribute("target", "_blank");
  // The footer band has its own Follow link.
  await expect(page.locator("footer").getByRole("link", { name: "Follow @thecuratedknot on Instagram" })).toHaveAttribute("href", ig);
  await page.getByRole("link", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test("/admin without a session offers Google sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});
