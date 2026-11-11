/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // The dev server serves a page's modules one by one the first time a browser opens it: with
  // two workers running, the first site page took up to 8 s to open (the built site loads it as
  // one prefetched chunk), past expect's default 5 s, and a whole spec past the default 30 s
  expect: { timeout: 15_000 },
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuses the dev server already on :3000; Nuxt allows one per project, so none starts beside it
  webServer: {
    command: "pnpm dev --no-tui",
    // The specs open the app where GitHub Pages serves it (/nurnet-plus/)
    env: { NUXT_APP_BASE_URL: "/nurnet-plus/" },
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
