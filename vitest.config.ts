/**
 * Vitest config.
 *
 * Unit tests read files and assert structure. Browser behaviour lives in e2e/
 * and belongs to Playwright — excluded here so `npm test` does not try to run
 * Playwright specs under the wrong runner.
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "e2e/**", "dist/**"],
    environment: "node",
    reporters: ["default"],
  },
});
