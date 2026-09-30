import { expect, test } from "@playwright/test";
import { adminSession, ADMIN_EMAIL, db } from "./helpers";

const NEW_ADMIN = "e2e-new-admin@example.com";
const PLAIN_ADMIN = "e2e-plain-admin@example.com";

test.beforeEach(async () => {
  await db`delete from user_roles where email in (${NEW_ADMIN}, ${PLAIN_ADMIN})`;
});

test("super admin adds an admin, changes the role, removes them", async ({ page }) => {
  await adminSession(page);
  await page.goto("/admin/admins");
  await expect(page.getByRole("heading", { name: "Admins", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText(ADMIN_EMAIL)).toBeVisible();
  await expect(page.getByText("Set in Vercel")).toBeVisible();
  await expect(page.getByText("They sign in with this Google email at /admin.")).toBeVisible();

  // Add (email is trimmed and lowercased).
  await page.getByLabel("Email").fill(`  ${NEW_ADMIN.toUpperCase()} `);
  await page.locator("select[name=role]").first().selectOption("admin");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const row = page.getByTestId("admin-row").filter({ hasText: NEW_ADMIN });
  await expect(row).toBeVisible();
  await expect(row.locator("span", { hasText: /^Admin$/ })).toBeVisible();
  expect((await db`select role from user_roles where email = ${NEW_ADMIN}`)[0].role).toBe("admin");

  // Change role.
  await row.locator("select").selectOption("super_admin");
  await row.getByRole("button", { name: `Change role for ${NEW_ADMIN}` }).click();
  await expect(row.locator("span", { hasText: /^Super admin$/ })).toBeVisible();
  expect((await db`select role from user_roles where email = ${NEW_ADMIN}`)[0].role).toBe("super_admin");

  // Adding the same email again updates instead of failing.
  await page.getByLabel("Email").fill(NEW_ADMIN);
  await page.locator("select[name=role]").first().selectOption("admin");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(row.locator("span", { hasText: /^Admin$/ })).toBeVisible();
  expect(await db`select 1 from user_roles where email = ${NEW_ADMIN}`).toHaveLength(1);

  // Remove needs a confirm.
  await row.getByRole("button", { name: `Remove ${NEW_ADMIN}` }).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Yes, remove" }).click();
  await expect(row).toHaveCount(0);
  expect(await db`select 1 from user_roles where email = ${NEW_ADMIN}`).toHaveLength(0);
});

test("bad email is rejected", async ({ page }) => {
  await adminSession(page);
  await page.goto("/admin/admins");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Browser validation or the server message, either way nothing is saved.
  expect(await db`select 1 from user_roles where email = 'not-an-email'`).toHaveLength(0);
});

test("a plain admin has no Admins tab and is sent away from /admin/admins", async ({ page }) => {
  await adminSession(page, PLAIN_ADMIN, "admin");
  await page.goto("/admin/registrations");
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Admins" })).toHaveCount(0);

  await page.goto("/admin/admins");
  await expect(page).not.toHaveURL(/\/admin\/admins/);
  await expect(page).toHaveURL(/\/admin\/registrations/);
});
