/**
 * Accessibility gate — axe-core against the running preview.
 *
 * QA-AND-LAUNCH.md requires an automated axe scan on both locales at desktop
 * and mobile widths, with zero serious or critical violations. This drives
 * Chrome over the DevTools protocol, injects axe-core, and reports.
 *
 * Usage: node scripts/check-a11y.mjs [baseUrl]
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:4321";
const PORT = 9400 + (process.pid % 300);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PAGES = ["/", "/en/", "/th/", "/en/estimate/", "/th/estimate/", "/en/privacy/", "/th/privacy/"];
const WIDTHS = [390, 1440];

/** Only these stop a launch. Minor/moderate are reported, not fatal. */
const FATAL = new Set(["serious", "critical"]);

const AXE_SOURCE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AXE_RUN = `
axe.run(document, {
  resultTypes: ['violations'],
  runOnly: {
    type: 'tag',
    values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']
  }
}).then(function (r) {
  return JSON.stringify(r.violations.map(function (v) {
    var first = v.nodes && v.nodes.length ? v.nodes[0] : null;
    return {
      id: v.id,
      impact: v.impact,
      help: v.help,
      n: v.nodes.length,
      target: first && first.target ? first.target.join(' ') : ''
    };
  }));
})`;

class Cdp {
  #ws; #id = 0; #pending = new Map();
  static async attach(url) {
    const c = new Cdp();
    c.#ws = new WebSocket(url);
    await new Promise((res, rej) => {
      c.#ws.addEventListener("open", res, { once: true });
      c.#ws.addEventListener("error", rej, { once: true });
    });
    c.#ws.addEventListener("message", (e) => {
      const m = JSON.parse(String(e.data));
      const slot = c.#pending.get(m.id);
      if (!slot) return;
      c.#pending.delete(m.id);
      m.error ? slot.reject(new Error(m.error.message)) : slot.resolve(m.result);
    });
    return c;
  }
  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.#ws.close(); }
}

const chrome = spawn(
  CHROME,
  ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`,
   `--user-data-dir=/tmp/jm-a11y-${process.pid}`, "about:blank"],
  { stdio: "ignore" }
);

let fatalCount = 0;
const seen = new Map();

try {
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(1500) });
      target = (await res.json()).find((t) => t.type === "page") ?? null;
    } catch { /* not up */ }
  }
  if (!target) throw new Error("Chrome debugging endpoint never came up");

  const cdp = await Cdp.attach(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  console.log("ACCESSIBILITY GATE — axe-core");
  console.log("-".repeat(72));

  for (const path of PAGES) {
    for (const width of WIDTHS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 768,
      });
      await cdp.send("Page.navigate", { url: `${BASE}${path}` });
      await sleep(900);

      await cdp.send("Runtime.evaluate", { expression: AXE_SOURCE });
      const run = await cdp.send("Runtime.evaluate", {
        expression: AXE_RUN,
        awaitPromise: true,
        returnByValue: true,
      });

      const violations = JSON.parse(run.result.value ?? "[]");
      const fatal = violations.filter((v) => FATAL.has(v.impact));
      fatalCount += fatal.length;

      const label = `${path} @ ${width}`;
      if (violations.length === 0) {
        console.log(`  PASS  ${label.padEnd(28)} no violations`);
      } else {
        const tag = fatal.length > 0 ? "FAIL" : "WARN";
        console.log(`  ${tag}  ${label.padEnd(28)} ${violations.length} (${fatal.length} serious/critical)`);
        for (const v of violations) {
          const key = `${v.id}|${v.impact}`;
          if (!seen.has(key)) seen.set(key, { ...v, where: label });
          console.log(`          [${(v.impact ?? "?").padEnd(8)}] ${v.id} x${v.n} — ${v.help}`);
          if (v.target) console.log(`                     ${v.target}`);
        }
      }
    }
  }
  cdp.close();
} finally {
  chrome.kill("SIGTERM");
}

console.log("-".repeat(72));
if (seen.size > 0) {
  console.log(`distinct issues: ${seen.size}`);
}
console.log(fatalCount === 0 ? "NO SERIOUS OR CRITICAL VIOLATIONS" : `${fatalCount} SERIOUS/CRITICAL VIOLATION(S)`);
process.exit(fatalCount === 0 ? 0 : 1);
