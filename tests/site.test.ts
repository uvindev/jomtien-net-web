/**
 * Structural tests.
 *
 * These read the files on disk. They catch the drift that behaviour tests miss
 * and that costs the most later: a locale losing a section, a redirect map
 * disagreeing with itself, a font referenced but never shipped, a page losing
 * the signature. All of it is cheap to check and expensive to discover in
 * production.
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string): string => readFileSync(p, "utf8");

const PAGES = [
  "index.html",
  "en/index.html",
  "th/index.html",
  "en/estimate/index.html",
  "th/estimate/index.html",
  "en/privacy/index.html",
  "th/privacy/index.html",
];

const LOCALE_PAIRS: [string, string][] = [
  ["en/index.html", "th/index.html"],
  ["en/estimate/index.html", "th/estimate/index.html"],
  ["en/privacy/index.html", "th/privacy/index.html"],
];

const all = (src: string, re: RegExp): string[] => [...src.matchAll(re)].map((m) => m[1] ?? "");

describe("assets referenced actually exist", () => {
  const css = read("src/styles.css");

  it("every self-hosted font file is on disk", () => {
    const fonts = all(css, /url\("(\/public\/fonts\/[^"]+)"\)/g);
    expect(fonts.length).toBeGreaterThan(0);
    for (const f of fonts) expect(existsSync(`.${f}`), `missing ${f}`).toBe(true);
  });

  it("ships the font licence", () => {
    expect(existsSync("public/fonts/OFL-IBM-Plex.txt")).toBe(true);
  });

  it("every artwork layer resolves to a built file", () => {
    const images = all(css, /url\("(\/public\/images\/[^"]+)"\)/g);
    for (const i of images) expect(existsSync(`.${i}`), `missing ${i}`).toBe(true);
  });

  it("every social card referenced in metadata exists", () => {
    for (const page of ["en/index.html", "th/index.html"]) {
      const og = all(read(page), /property="og:image" content="https:\/\/jomtien\.net(\/[^"]+)"/g);
      expect(og.length, `${page} has no og:image`).toBe(1);
      for (const o of og) expect(existsSync(`.${o}`), `missing ${o}`).toBe(true);
    }
  });
});

describe("locale parity", () => {
  it.each(LOCALE_PAIRS)("%s and %s expose the same sections", (a, b) => {
    const ids = (p: string) => all(read(p), /<section id="([^"]+)"/g).sort();
    expect(ids(b)).toEqual(ids(a));
  });

  it("the enquiry form offers identical project-type values", () => {
    const values = (p: string) => all(read(p), /<option value="([^"]+)">/g).sort();
    expect(values("th/index.html")).toEqual(values("en/index.html"));
  });

  it("the scoping form has the same number of steps", () => {
    const steps = (p: string) => (read(p).match(/class="scope-step"/g) ?? []).length;
    expect(steps("th/estimate/index.html")).toBe(steps("en/estimate/index.html"));
    expect(steps("en/estimate/index.html")).toBe(6);
  });

  it("the privacy notice has the same fill-ins on both sides", () => {
    // Strip comments first: the file's own header explains the fill mechanism
    // and would otherwise be counted as one.
    const fills = (p: string) =>
      (read(p).replace(/<!--[\s\S]*?-->/g, "").match(/<span class="fill">/g) ?? []).length;
    expect(fills("en/privacy/index.html")).toBe(13);
    expect(fills("th/privacy/index.html")).toBe(fills("en/privacy/index.html"));
  });

  it("hreflang is reciprocal on every page that declares it", () => {
    for (const page of PAGES) {
      const src = read(page);
      if (!src.includes('hreflang="th"')) continue;
      expect(src, `${page} missing en alternate`).toMatch(/hreflang="en" href="https:\/\/jomtien\.net\//);
      expect(src, `${page} missing th alternate`).toMatch(/hreflang="th" href="https:\/\/jomtien\.net\//);
    }
  });
});

describe("redirect map", () => {
  const legacy = ["/index.php", "/index.php/product.html", "/index.php/contact.html"];

  it("_redirects and vercel.json cover the same legacy URLs", () => {
    const redirects = read("_redirects");
    const vercel = JSON.parse(read("vercel.json")) as {
      redirects: { source: string; destination: string; permanent: boolean }[];
    };
    for (const url of legacy) {
      expect(redirects, `_redirects missing ${url}`).toContain(url);
      expect(vercel.redirects.some((r) => r.source === url), `vercel.json missing ${url}`).toBe(true);
    }
  });

  it("every redirect is permanent and lands somewhere real", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      redirects: { source: string; destination: string; permanent: boolean }[];
    };
    for (const r of vercel.redirects) {
      expect(r.permanent, `${r.source} is not permanent`).toBe(true);
      const path = r.destination.split("#")[0] ?? "";
      expect(existsSync(`.${path}index.html`), `${r.destination} has no page`).toBe(true);
    }
  });

  it("no redirect points at another redirect", () => {
    const vercel = JSON.parse(read("vercel.json")) as { redirects: { source: string; destination: string }[] };
    const sources = new Set(vercel.redirects.map((r) => r.source));
    for (const r of vercel.redirects) {
      expect(sources.has(r.destination.split("#")[0] ?? ""), `chain from ${r.source}`).toBe(false);
    }
  });
});

describe("search metadata", () => {
  it.each(PAGES)("%s has a title within the ~62 char display limit", (page) => {
    const title = read(page).match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThanOrEqual(62);
  });

  it.each(PAGES)("%s has a description within the ~160 char display limit", (page) => {
    const desc = read(page).match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    expect(desc.length).toBeGreaterThan(60);
    expect(desc.length).toBeLessThanOrEqual(160);
  });

  it.each(PAGES)("%s declares a canonical URL", (page) => {
    expect(read(page)).toMatch(/<link rel="canonical" href="https:\/\/jomtien\.net\//);
  });

  it("every indexable page carries a social image", () => {
    for (const page of PAGES) {
      const src = read(page);
      if (src.includes('content="noindex"')) continue;
      if (!src.includes("og:type")) continue;
      expect(src, `${page} has og tags but no og:image`).toContain("og:image");
    }
  });
});

describe("sitemap", () => {
  const sitemap = read("sitemap.xml");

  it("never lists a page that is marked noindex", () => {
    // A sitemap advertising a noindex URL is a contradiction search engines
    // report as an error.
    for (const page of PAGES) {
      if (!read(page).includes('content="noindex"')) continue;
      const url = "https://jomtien.net/" + page.replace(/index\.html$/, "");
      expect(sitemap, `sitemap lists noindex page ${page}`).not.toContain(`<loc>${url}</loc>`);
    }
  });

  it("every entry carries a lastmod", () => {
    const locs = (sitemap.match(/<loc>/g) ?? []).length;
    const mods = (sitemap.match(/<lastmod>/g) ?? []).length;
    expect(mods).toBe(locs);
  });

  it("lists only pages that exist", () => {
    const locs = all(sitemap, /<loc>https:\/\/jomtien\.net(\/[^<]*)<\/loc>/g);
    expect(locs.length).toBeGreaterThan(0);
    for (const l of locs) expect(existsSync(`.${l}index.html`), `sitemap lists missing ${l}`).toBe(true);
  });

  it("lists both landing pages", () => {
    expect(sitemap).toContain("https://jomtien.net/en/");
    expect(sitemap).toContain("https://jomtien.net/th/");
  });
});

describe("IAMUVIN signature", () => {
  it.each(PAGES)("%s carries author metadata and the footer credit", (page) => {
    const src = read(page);
    expect(src).toContain('name="author" content="Uvin Vindula');
    expect(src).toContain("https://iamuvin.com");
  });

  it("the attribution line uses an em dash, never a hyphen", () => {
    for (const page of [...PAGES, "humans.txt", "README.md"]) {
      const src = read(page);
      expect(src, `${page} uses a hyphen in the credit`).not.toMatch(/Built by Uvin Vindula\s*-\s/);
    }
  });

  it("no page clears the console", () => {
    for (const page of [...PAGES, "src/main.ts"]) {
      expect(read(page), `${page} calls console.clear`).not.toContain("console.clear");
    }
  });

  it("package.json carries author and homepage", () => {
    const pkg = JSON.parse(read("package.json")) as { author: string; homepage: string };
    expect(pkg.author).toContain("Uvin Vindula");
    expect(pkg.homepage).toBe("https://iamuvin.com");
  });
});

describe("content honesty", () => {
  it.each(PAGES)("%s renders no THB figure", (page) => {
    // Strip comments — developer notes may reference the unapproved price.
    const body = read(page).replace(/<!--[\s\S]*?-->/g, "");
    expect(body).not.toMatch(/\d[\d,]*\s*(THB|บาท)/);
  });

  it.each(PAGES)("%s carries no unverified marker in rendered text", (page) => {
    const body = read(page)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ");
    expect(body).not.toMatch(/UNVERIFIED/i);
  });

  it("every new-tab link is safe", () => {
    for (const page of PAGES) {
      for (const tag of read(page).match(/<a[^>]*target="_blank"[^>]*>/g) ?? []) {
        expect(tag, `${page}: ${tag}`).toMatch(/rel="[^"]*noopener[^"]*noreferrer/);
      }
    }
  });
});

describe("security headers", () => {
  const headers = read("_headers");
  const vercel = JSON.parse(read("vercel.json")) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const REQUIRED = [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Built-By",
  ];

  it.each(REQUIRED)("_headers sets %s", (key) => {
    expect(headers).toContain(key);
  });

  it.each(REQUIRED)("vercel.json sets %s", (key) => {
    const root = vercel.headers.find((h) => h.source === "/(.*)");
    expect(root?.headers.some((h) => h.key === key)).toBe(true);
  });

  it("the CSP allows no external origin", () => {
    const csp = headers.match(/Content-Security-Policy: ([^\n]+)/)?.[1] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("HSTS stays commented until HTTPS is proven", () => {
    expect(headers).toMatch(/#\s*Strict-Transport-Security/);
  });

  // Hostinger runs Apache, which ignores _headers, _redirects and vercel.json
  // entirely. .htaccess is the only one that applies there, so it must carry
  // the same policy — a drift here ships a site with no security headers.
  const htaccess = read(".htaccess");

  it.each(REQUIRED)(".htaccess sets %s", (key) => {
    expect(htaccess).toContain(key);
  });

  it(".htaccess CSP matches the Netlify/Cloudflare one exactly", () => {
    const fromHeaders = headers.match(/Content-Security-Policy: ([^\n]+)/)?.[1]?.trim();
    const fromHtaccess = htaccess
      .match(/Header always set Content-Security-Policy "([^"]+)"/)?.[1]
      ?.trim();
    expect(fromHeaders).toBeTruthy();
    expect(fromHtaccess).toBe(fromHeaders);
  });

  it(".htaccess carries every legacy redirect", () => {
    for (const url of ["index\\.php/product\\.html", "index\\.php/contact\\.html"]) {
      expect(htaccess, `htaccess missing redirect for ${url}`).toContain(url);
    }
    expect(htaccess).toMatch(/RewriteRule \^index\\\.php/);
  });

  it(".htaccess keeps HSTS commented too", () => {
    expect(htaccess).toMatch(/#\s*Header always set Strict-Transport-Security/);
  });

  it(".htaccess declares AVIF and WOFF2 mime types", () => {
    // Served with the wrong Content-Type these fail silently and look like a
    // CSS bug. Older Apache builds do not know AVIF.
    expect(htaccess).toMatch(/AddType\s+image\/avif\s+\.avif/);
    expect(htaccess).toMatch(/AddType\s+font\/woff2\s+\.woff2/);
  });

  it("a 404 document exists and is wired up", () => {
    expect(htaccess).toContain("ErrorDocument 404 /404.html");
    expect(existsSync("404.html")).toBe(true);
    const page = read("404.html");
    expect(page).toContain('href="/en/"');
    expect(page).toContain('href="/th/"');
    expect(page).toContain('content="noindex"');
  });
});
