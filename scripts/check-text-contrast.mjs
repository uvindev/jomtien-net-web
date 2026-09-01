/**
 * Text contrast over background imagery.
 *
 * scripts/check-contrast.mjs proves the token palette. It cannot prove text
 * sitting on a photograph or generated artwork, because the effective
 * background is whatever the image is doing at that pixel.
 *
 * This renders each page twice — once normally, once with every glyph made
 * transparent — diffs them to locate real glyph ink, then measures the text
 * colour against the true background at those coordinates. Only text inside a
 * section carrying an .art layer is tested; flat-token text is already covered.
 *
 * Usage: node scripts/check-text-contrast.mjs [baseUrl]
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:4321";
const PORT = 9300 + (process.pid % 400);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DPR = 1;   // 1 is plenty for luminance sampling and 4x cheaper

const CASES = [
  { path: "/", width: 390 },
  { path: "/", width: 1440 },
  { path: "/en/", width: 390 },
  { path: "/en/", width: 1440 },
  { path: "/th/", width: 390 },
  { path: "/th/", width: 1440 },
];

const dir = mkdtempSync(join(tmpdir(), "jm-contrast-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Collects every text-bearing element that sits inside a section with an
   .art layer, with its rect and resolved colour. WCAG large text (>=24px, or
   >=18.66px bold) needs 3:1; everything else 4.5:1. */
const COLLECT = `(() => {
  const out = [];
  const arts = [...document.querySelectorAll('.art, .facets, .art-scrim')]
    .map(a => a.closest('section') || a.parentElement);
  const scopes = [...new Set(arts)].filter(Boolean);
  for (const scope of scopes) {
    for (const el of scope.querySelectorAll('h1,h2,h3,p,a,span,strong,li,dt,dd,label,legend,button,summary')) {
      const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!direct) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (r.bottom < 0 || (r.top + window.scrollY) > 4200) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const m = cs.color.match(/\\d+/g);
      if (!m) continue;
      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      out.push({
        label: el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''),
        text: (el.textContent || '').trim().slice(0, 42),
        x: r.left + window.scrollX, y: r.top + window.scrollY,
        w: r.width, h: r.height,
        color: [ +m[0], +m[1], +m[2] ],
        required: large ? 3 : 4.5
      });
    }
  }
  return JSON.stringify(out);
})()`;

const SLIDE_COUNT = `(() => document.querySelectorAll('.hero-slide').length)()`;

const showSlide = (i) => `(() => {
  const s = [...document.querySelectorAll('.hero-slide')];
  if (s.length === 0) return 0;
  s.forEach((el, n) => {
    el.removeAttribute('data-on');
    el.style.transition = 'none';
    if (n === ${i}) el.setAttribute('data-on', 'true');
  });
  return s.length;
})()`;

const HIDE_TEXT = `(() => {
  const s = document.createElement('style');
  s.id = '__hide_text__';
  s.textContent = '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;caret-color:transparent!important}';
  document.head.appendChild(s);
  return 'ok';
})()`;

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

const python = (payload) =>
  new Promise((resolve, reject) => {
    const p = spawn("python3", ["scripts/_contrast-pixels.py"]);
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) =>
      code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err || `exit ${code}`))
    );
    p.stdin.end(JSON.stringify(payload));
  });

const chrome = spawn(
  CHROME,
  ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`,
   `--user-data-dir=/tmp/jm-contrast-${process.pid}`, "--force-color-profile=srgb", "about:blank"],
  { stdio: "ignore" }
);

const failures = [];

try {
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(1500) })).json();
      target = list.find((t) => t.type === "page") ?? null;
    } catch { /* not up */ }
  }
  if (!target) throw new Error("Chrome debugging endpoint never came up");

  const cdp = await Cdp.attach(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  console.log("TEXT-OVER-IMAGERY CONTRAST GATE");
  console.log("-".repeat(72));

  for (const { path, width } of CASES) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width, height: 900, deviceScaleFactor: DPR, mobile: width < 768,
    });
    await cdp.send("Page.navigate", { url: `${BASE}${path}` });
    await sleep(1100);

    const hRes = await cdp.send("Runtime.evaluate", {
      expression: "document.documentElement.scrollHeight", returnByValue: true });
    const pageHeight = Number(hRes.result.value) || 4000;

    const collected = await cdp.send("Runtime.evaluate", { expression: COLLECT, returnByValue: true });
    const elements = JSON.parse(collected.result.value);
    if (elements.length === 0) { console.log(`  SKIP  ${path} @ ${width} — no art-backed text`); continue; }

    const shot = async (file) => {
      const r = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: Math.min(pageHeight, 4400), scale: 1 } });
      const p = join(dir, file);
      writeFileSync(p, Buffer.from(r.data, "base64"));
      return p;
    };

    const nSlides = Number(
      (await cdp.send("Runtime.evaluate", { expression: SLIDE_COUNT, returnByValue: true }))
        .result.value
    ) || 0;

    // Measure every hero slide, not just the one that happens to be showing.
    const rows = [];
    for (let slide = 0; slide < Math.max(1, nSlides); slide++) {
      if (nSlides > 0) {
        await cdp.send("Runtime.evaluate", { expression: showSlide(slide), returnByValue: true });
        await sleep(160);
      }
      const tag = `${width}-${path.replace(/\W/g, "")}-s${slide}`;
      const normal = await shot(`n-${tag}.png`);
      await cdp.send("Runtime.evaluate", { expression: HIDE_TEXT, returnByValue: true });
      await sleep(200);
      const plain = await shot(`p-${tag}.png`);
      const batch = await python({ normal, plain, dpr: DPR, elements });
      for (const r of batch) rows.push({ ...r, slide });
      if (nSlides > 0 && slide < nSlides - 1) {
        await cdp.send("Page.navigate", { url: `${BASE}${path}` });
        await sleep(900);
      }
    }

    const bad = rows.filter((r) => !r.pass);
    const worst = rows.reduce((a, b) => (a && a.ratio < b.ratio ? a : b), null);

    if (rows.length === 0) {
      console.log(`  FAIL  ${(path + " @ " + width).padEnd(26)} measured NOTHING — scope or capture is wrong`);
      failures.push({ path, width, ratio: 0, required: 0, fg: "-", bg: "-", label: "no elements measured", text: "" });
    } else if (bad.length === 0) {
      const slideNote = nSlides > 1 ? ` across ${nSlides} slides` : "";
      console.log(`  PASS  ${(path + " @ " + width).padEnd(26)} ${rows.length} measurements${slideNote}, worst ${worst?.ratio ?? "-"}:1`);
    } else {
      console.log(`  FAIL  ${(path + " @ " + width).padEnd(26)} ${bad.length}/${rows.length} below minimum`);
      for (const b of bad.slice(0, 6)) {
        console.log(`          slide ${b.slide ?? 0}: ${String(b.ratio).padStart(5)}:1 (need ${b.required})  ${b.fg} on ${b.bg}  ${b.label}`);
        console.log(`          └─ "${b.text}"`);
      }
      failures.push(...bad.map((b) => ({ ...b, path, width })));
    }
  }
  cdp.close();
} finally {
  chrome.kill("SIGTERM");
}

console.log("-".repeat(72));
console.log(failures.length === 0 ? "TEXT CONTRAST OK" : `${failures.length} TEXT/IMAGE CONTRAST FAILURE(S)`);
process.exit(failures.length === 0 ? 0 : 1);
