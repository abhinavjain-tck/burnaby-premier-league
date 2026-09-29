import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Local Supabase keys live in .env.e2e (public demo values). Loaded here so the
// dev server and the test workers see the same env.
if (existsSync(".env.e2e")) process.loadEnvFile(".env.e2e");

// Set E2E_PORT if something else already uses 3000.
const port = process.env.E2E_PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  // One shared database, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: process.env as Record<string, string>,
  },
});
