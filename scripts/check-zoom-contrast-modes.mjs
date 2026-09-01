/**
 * Zoom and forced-colors gate.
 *
 * Two checks QA-AND-LAUNCH.md asks for that nothing else covers:
 *
 *   200% zoom — WCAG 1.4.4. Browser zoom halves the layout viewport, so a
 *   1280x1024 window at 200% lays out as 640x512. Asserts no horizontal
 *   overflow and no interactive control pushed outside the page box.
 *
 *   forced-colors — Windows High Contrast. The system replaces author colours,
 *   so a control whose only boundary is a background-color disappears. Asserts
 *   every button carries a real border, which is what survives the override.
 *
 * Usage: node scripts/check-zoom-contrast-modes.mjs [baseUrl]
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { spawn } from "node:child_process";

const BASE = process.argv[2] ?? "http://localhost:4321";
const PORT = 9600 + (process.pid % 300);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGES = ["/", "/en/", "/th/", "/en/estimate/", "/th/estimate/", "/en/privacy/", "/th/privacy/"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/* 200% zoom: nothing may overflow, and every control stays inside the page. */
const ZOOM_CHECK = `(() => {
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - doc.clientWidth;
  const strays = [];
  for (const el of document.querySelectorAll('a, button, input, select, textarea, summary')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Honeypots are parked off-screen on purpose and are aria-hidden, so they
    // are not content a zoomed user can lose.
    if (el.closest('[aria-hidden="true"]')) continue;
    if (r.right > doc.clientWidth + 1 || r.left < -1) {
      strays.push(el.tagName.toLowerCase() + ' "' + (el.textContent || '').trim().slice(0, 24) + '"');
    }
  }
  return JSON.stringify({ overflow, strays: strays.slice(0, 5), strayCount: strays.length });
})()`;

/* forced-colors: a background-only control vanishes when the system repaints. */
const FORCED_CHECK = `(() => {
  const bad = [];
  for (const el of document.querySelectorAll('.btn, button')) {
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    // Visually-hidden controls (sr-only) have no border by design; they are
    // checked separately in their focused state, which is when they render.
    if (cs.position === 'absolute' && b.width <= 2) continue;
    const w = parseFloat(cs.borderTopWidth) || 0;
    if (cs.borderTopStyle === 'none' || w === 0) {
      bad.push(el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''));
    }
  }
  const media = matchMedia('(forced-colors: active)').matches;

  // The skip link is the one control that is hidden until it matters. Focus it
  // and confirm it becomes a real, bordered target rather than vanishing.
  // WCAG 2.4.1 applies to blocks repeated across pages. The language gate has
  // no header and no nav, so it has nothing to bypass and needs no skip link —
  // demanding one there would add noise for a screen-reader user, not remove it.
  let skip = document.querySelector('header') ? 'absent' : 'not-required';
  const link = document.querySelector('a[href="#main"]');
  if (link) {
    link.focus();
    const fs = getComputedStyle(link);
    const fb = link.getBoundingClientRect();
    skip = (parseFloat(fs.borderTopWidth) || 0) > 0 && fb.width > 40 ? 'ok' : 'invisible-on-focus';
    link.blur();
  }
  return JSON.stringify({ media, skip, borderless: [...new Set(bad)].slice(0, 5), count: bad.length });
})()`;

const chrome = spawn(
  CHROME,
  ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`,
   `--user-data-dir=/tmp/jm-zoom-${process.pid}`, "about:blank"],
  { stdio: "ignore" }
);

let failed = 0;

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

  console.log("ZOOM AND FORCED-COLORS GATE");
  console.log("-".repeat(70));
  console.log("200% zoom — a 1280x1024 window lays out as 640x512");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 640, height: 512, deviceScaleFactor: 1, mobile: false,
  });
  for (const path of PAGES) {
    await cdp.send("Page.navigate", { url: `${BASE}${path}` });
    await sleep(700);
    const r = await cdp.send("Runtime.evaluate", { expression: ZOOM_CHECK, returnByValue: true });
    const { overflow, strays, strayCount } = JSON.parse(r.result.value);
    const ok = overflow <= 1 && strayCount === 0;
    if (!ok) failed++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${path.padEnd(18)} overflow ${overflow}px · ${strayCount} control(s) out of bounds`);
    for (const s of strays) console.log(`          ${s}`);
  }

  console.log("\nforced-colors: active — controls must survive a system repaint");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "forced-colors", value: "active" }],
  });
  for (const path of PAGES) {
    await cdp.send("Page.navigate", { url: `${BASE}${path}` });
    await sleep(700);
    const r = await cdp.send("Runtime.evaluate", { expression: FORCED_CHECK, returnByValue: true });
    const { media, skip, borderless, count } = JSON.parse(r.result.value);
    const ok = count === 0 && (skip === "ok" || skip === "not-required");
    if (!ok) failed++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${path.padEnd(18)} forced-colors ${media ? "active" : "NOT APPLIED"} · ${count} borderless · skip link ${skip}`);
    for (const b of borderless) console.log(`          ${b}`);
  }

  cdp.close();
} finally {
  chrome.kill("SIGTERM");
}

console.log("-".repeat(70));
console.log(failed === 0 ? "ZOOM AND FORCED-COLORS OK" : `${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
