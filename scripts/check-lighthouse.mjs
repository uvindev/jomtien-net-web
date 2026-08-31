/**
 * Lighthouse gate.
 *
 * QA-AND-LAUNCH.md asks for three mobile runs per locale under one recorded
 * environment, reporting the median. Lab scores are noisy — a single run is a
 * number, three runs and a median is a measurement — so that is what this does.
 *
 * Targets: Performance >= 90, Accessibility >= 95, Best Practices >= 95,
 * SEO >= 95. Raw JSON for every run is written to lighthouse-reports/.
 *
 * Usage: node scripts/check-lighthouse.mjs [baseUrl]
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { mkdirSync, writeFileSync } from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE = process.argv[2] ?? "http://localhost:4321";
const RUNS = 3;
const OUT = "lighthouse-reports";

const PAGES = ["/en/", "/th/"];
const TARGETS = {
  performance: 90,
  accessibility: 95,
  "best-practices": 95,
  seo: 95,
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

mkdirSync(OUT, { recursive: true });

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless", "--disable-gpu", "--no-first-run"],
});

let failed = 0;
const summary = [];

try {
  console.log("LIGHTHOUSE GATE — mobile, 3 runs, median");
  console.log(`environment: Chrome ${chrome.process ? "headless" : "?"} · ${RUNS} runs per page`);
  console.log("-".repeat(72));

  for (const path of PAGES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(
        `${BASE}${path}`,
        { port: chrome.port, output: "json", logLevel: "error" },
        undefined
      );
      if (!result?.lhr) throw new Error(`no result for ${path}`);
      runs.push(result.lhr);
      writeFileSync(
        `${OUT}/${path.replace(/\W/g, "") || "root"}-run${i + 1}.json`,
        result.report
      );
    }

    const row = { path };
    let pageFailed = false;
    const parts = [];

    for (const [key, target] of Object.entries(TARGETS)) {
      const scores = runs.map((r) => Math.round((r.categories[key]?.score ?? 0) * 100));
      const m = median(scores);
      row[key] = m;
      const ok = m >= target;
      if (!ok) { pageFailed = true; failed++; }
      parts.push(`${key.slice(0, 4)} ${String(m).padStart(3)}${ok ? " " : "!"}`);
    }

    // Lab timings worth recording even when the score passes.
    const lcp = median(runs.map((r) => r.audits["largest-contentful-paint"]?.numericValue ?? 0));
    const cls = median(runs.map((r) => r.audits["cumulative-layout-shift"]?.numericValue ?? 0));
    const tbt = median(runs.map((r) => r.audits["total-blocking-time"]?.numericValue ?? 0));
    row.lcp = Math.round(lcp);
    row.cls = Number(cls.toFixed(3));
    row.tbt = Math.round(tbt);
    summary.push(row);

    console.log(`  ${pageFailed ? "FAIL" : "PASS"}  ${path.padEnd(8)} ${parts.join("  ")}`);
    console.log(`        LCP ${row.lcp}ms · CLS ${row.cls} · TBT ${row.tbt}ms`);
    console.log(`        runs: ${runs.map((r) => Math.round((r.categories.performance?.score ?? 0) * 100)).join(", ")}`);
  }
} finally {
  await chrome.kill();
}

console.log("-".repeat(72));
console.log(`targets: perf>=90 a11y>=95 bp>=95 seo>=95 · raw reports in ${OUT}/`);
console.log(failed === 0 ? "LIGHTHOUSE TARGETS MET" : `${failed} CATEGORY MISS(ES)`);
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
process.exit(failed === 0 ? 0 : 1);
