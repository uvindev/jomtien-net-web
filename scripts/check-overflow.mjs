/**
 * Horizontal-overflow gate.
 *
 * QA-AND-LAUNCH.md requires no horizontal overflow at 320, 390, 768, 1024,
 * 1440 and 1920 CSS px. Screenshots cannot prove this — Chrome clamps window
 * width and a cropped image looks identical to a real overflow — so this
 * drives Chrome over the DevTools protocol and reads scrollWidth directly.
 *
 * Uses Node's built-in WebSocket (Node 22+). No dependencies.
 *
 * Usage: node scripts/check-overflow.mjs [baseUrl]
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

const BASE = process.argv[2] ?? "http://localhost:4321";
const PORT = 9223;
const WIDTHS = [320, 390, 768, 1024, 1440, 1920];
const PATHS = ["/en/", "/th/", "/en/estimate/", "/th/estimate/"];

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal CDP client over the built-in WebSocket. */
class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();

  static async attach(wsUrl) {
    const client = new Cdp();
    client.#ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      client.#ws.addEventListener("open", resolve, { once: true });
      client.#ws.addEventListener("error", reject, { once: true });
    });
    client.#ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      const slot = client.#pending.get(msg.id);
      if (!slot) return;
      client.#pending.delete(msg.id);
      msg.error ? slot.reject(new Error(msg.error.message)) : slot.resolve(msg.result);
    });
    return client;
  }

  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.#ws.close();
  }
}

const chrome = (await import("node:child_process")).spawn(
  CHROME,
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${PORT}`,
    "--user-data-dir=/tmp/jomtien-overflow-profile",
    "about:blank",
  ],
  { stdio: "ignore", detached: false }
);

let failed = 0;

try {
  // Wait for the debugging endpoint.
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      target = list.find((t) => t.type === "page") ?? null;
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error("Chrome debugging endpoint never came up");

  const cdp = await Cdp.attach(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  console.log("HORIZONTAL OVERFLOW GATE");
  console.log("-".repeat(64));

  for (const path of PATHS) {
    const marks = [];
    for (const width of WIDTHS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
      await cdp.send("Page.navigate", { url: `${BASE}${path}` });
      await sleep(450);

      const { result } = await cdp.send("Runtime.evaluate", {
        expression: `JSON.stringify({
          scroll: document.documentElement.scrollWidth,
          inner: window.innerWidth,
          worst: (() => {
            let w = 0, tag = '';
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect();
              if (r.right > window.innerWidth + 1 && r.right > w) {
                w = r.right;
                tag = el.tagName.toLowerCase() +
                  (el.className && typeof el.className === 'string'
                    ? '.' + el.className.trim().split(/\\s+/).slice(0,3).join('.')
                    : '');
              }
            }
            return tag ? tag + ' @ ' + Math.round(w) + 'px' : null;
          })()
        })`,
        returnByValue: true,
      });

      const { scroll, inner, worst } = JSON.parse(result.value);
      const over = scroll > inner + 1;
      if (over) {
        failed++;
        marks.push(`${width}:OVER(${scroll})`);
        console.log(`  FAIL  ${path} @ ${width}px — scrollWidth ${scroll} > ${inner}`);
        if (worst) console.log(`        widest offender: ${worst}`);
      } else {
        marks.push(`${width}:ok`);
      }
    }
    if (!marks.some((m) => m.includes("OVER"))) {
      console.log(`  PASS  ${path.padEnd(18)} ${marks.map((m) => m.split(":")[0]).join(" ")}`);
    }
  }

  cdp.close();
} finally {
  chrome.kill("SIGTERM");
}

console.log("-".repeat(64));
console.log(failed === 0 ? "NO HORIZONTAL OVERFLOW" : `${failed} OVERFLOW FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
