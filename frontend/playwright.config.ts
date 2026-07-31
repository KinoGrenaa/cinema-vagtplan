import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.env.FLOW_TEST_BROWSER_CHANNEL?.trim();

export default defineConfig({
  testDir: "./tests/flows",
  outputDir: "./test-results/flows",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  reporter: [["line"]],
  use: {
    ...devices["Desktop Chrome"],
    ...(browserChannel ? { channel: browserChannel } : {}),
    baseURL:
      process.env.FRONTEND_FLOW_BASE_URL ||
      "http://127.0.0.1:3000",
    locale: "da-DK",
    timezoneId: "Europe/Copenhagen",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
});
