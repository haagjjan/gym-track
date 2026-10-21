import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "status.browser.spec.ts",
  outputDir: "../../test-results/status",
  fullyParallel: false,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: "http://127.0.0.1:4179", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } }
  ],
  webServer: {
    command: "node scripts/preview.mjs",
    env: { STATUS_PREVIEW_PORT: "4179" },
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false
  }
});
