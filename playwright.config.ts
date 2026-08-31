/**
 * Playwright config.
 *
 * Uses the Chrome already installed on the machine (`channel: "chrome"`) rather
 * than downloading a bundled browser — this is a static site with no build
 * server, and a 200 MB download to test six HTML files is not a trade worth
 * making. CI without a system Chrome should run `npx playwright install chromium`
 * and drop the channel line.
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "list" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}/en/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
