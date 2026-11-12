/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

// The specs in e2e-built/, against the built site served as GitHub Pages serves it (e2e-built/
// serve.ts): what a shared link, a link preview or a returning visitor's service worker gets once
// deployed. Local only, after a build: `vp run generate`, then `vp run e2e-built`
export default defineConfig({
  testDir: "./e2e-built",
  fullyParallel: true,
  reporter: "list",
  // Installing the service worker precaches the app and its data (~9 MB)
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:4300" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "vpx e2e-built/serve.ts 4300",
    url: "http://localhost:4300/nurnet-plus/",
    reuseExistingServer: true,
  },
});
