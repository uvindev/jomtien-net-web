# Jomtien Network — landing site

Bilingual (EN/TH) static site for a company that builds business websites,
e-commerce platforms, web and mobile applications, AI systems, and integrations.

Static HTML, Tailwind CSS v4.3, one TypeScript island. No framework, no server,
no build-time templating. Every page is a file you can open and read.

## Run it

```bash
npm install
npm run build          # tailwind + tsc -> dist/
python3 -m http.server 4321
```

Then open <http://localhost:4321/en/>.

While working: `npm run dev:css` and `npm run dev:ts` in two terminals, plus the
server in a third.

## Layout

```text
index.html            language gate
en/  th/              landing page, /estimate/, /privacy/ per locale
src/styles.css        @theme tokens, @font-face, component layer
src/main.ts           the entire client island (~13 KB unminified)
public/fonts/         self-hosted OFL WOFF2 subsets + licence
scripts/              contrast, signature, and launch gates
assets-inbox/         drop owner-supplied originals here (gitignored)
```

## Gates

```bash
npm run verify        # typecheck + lint + unit tests + build + contrast + signature
npm run verify:all    # the above, plus e2e, overflow, text contrast, axe, launch
```

- **lint** — ESLint at zero warnings, type-aware. Enforces the house gates that
  were previously written down and checked by nothing: no `any`, no floating
  promises, exhaustive switches, `eqeqeq`, function length.
- **test** — 55 structural tests. Locale parity, redirect-map consistency,
  every referenced font and image existing on disk, sitemap accuracy, signature
  layers, security headers, and that no THB figure reaches a page.
- **test:e2e** — 35 Playwright tests across desktop and mobile. Form states,
  the stepped scoping flow, keyboard navigation, locale round-trip, and that
  the form never claims delivery it did not make.

- **contrast** — every colour pair the page renders, measured against WCAG 2.2.
  21 pairs, all passing. The reference site's own red ships at 3.65:1; ours is
  split into a text-bearing cut and a decorative cut so the hot red survives
  without failing.
- **overflow** — drives Chrome over the DevTools protocol and reads
  `scrollWidth` at 320, 390, 768, 1024, 1440 and 1920 CSS px on all four main
  pages. Screenshots cannot prove this: Chrome clamps window width, so a
  cropped image is indistinguishable from a real overflow.
- **text contrast over imagery** — the palette gate above cannot prove text
  sitting on generated artwork, because the effective background is whatever
  the image does at that pixel. This renders each page twice, once with every
  glyph made transparent, diffs the two to find where ink actually lands, and
  measures the text colour against the true background there. It caught the
  hero body copy at 2.51:1 against the lightened coastline; it now reads 6.97:1.
- **a11y** — axe-core on all six pages at mobile and desktop. Zero serious or
  critical violations.
- **signature** — the IAMUVIN provenance layers. Exits `SIGNED`.
- **launch** — build slots, unfilled legal values, unverified markers, locale
  parity, external link safety. **Currently exits `BLOCKED` by design.** See
  below.

## Images

```bash
npm run images
```

Renders the two social cards and processes anything dropped into
`assets-inbox/generated/` into AVIF + WebP + PNG in `public/images/`.

- **Social cards** are authored, not generated — `assets/og/og-{en,th}.html`
  rendered through headless Chrome with the site's own fonts and tokens.
  Image models cannot set type, and these images are mostly type.
- **Decorative artwork** is generated. Prompts, locked to the real tokens, are
  in [`docs/IMAGE-PROMPTS.md`](docs/IMAGE-PROMPTS.md).
- **Missing art is not a failure.** Each piece is a CSS `background-image`
  layer over the existing CSS facets, so an absent file paints nothing — no
  broken icon, no reserved gap, no layout shift.
- **Evidence is never generated.** No case-study screenshots, client logos,
  badges, awards, or headshots. That line is in the prompt sheet too.

## Deploying to Hostinger

```bash
npm run deploy:bundle
```

Builds fresh and writes `deploy/` — **upload the contents of that folder into
`public_html/`, not the folder itself.** 37 files, ~1.3 MB.

The bundle script verifies before it exits: every required file present, no
`node_modules/` `src/` `tests/` `scripts/` `docs/` or config leaking into a
public web root, and every `/dist/` and `/public/` reference in the HTML
resolving inside the bundle.

**The repository is not the deployable artefact.** `dist/` is gitignored build
output the site cannot run without — uploading a clone gives you an unstyled
page with no JavaScript. Always deploy from `npm run deploy:bundle`.

After upload:

1. Confirm `.htaccess` uploaded (FTP clients hide dotfiles by default).
2. Load `/en/`, `/th/`, `/en/estimate/`, and a deliberately wrong URL for the 404.
3. `curl -sI https://jomtien.net/ | grep -i 'content-security-policy\|x-built-by'`
4. `curl -sI https://jomtien.net/index.php` — expect `301` to `/en/`.
5. Only once HTTPS is confirmed on the apex **and every subdomain**, uncomment
   the HSTS line in `.htaccess`. A cached `max-age` cannot be withdrawn.

## Security headers

`.htaccess` (Apache / Hostinger), `_headers` (Netlify / Cloudflare Pages),
`_redirects`, and `vercel.json` all carry the same set: a strict CSP, `nosniff`, `DENY` framing, `Referrer-Policy`,
`Permissions-Policy`, COOP/CORP, the `X-Built-By` signature header, cache
policy, and the three legacy Joomla redirects.

Apache ignores `_headers`, `_redirects` and `vercel.json` completely, so
`.htaccess` is the only one that applies on Hostinger. Unit tests assert the
CSP string is byte-identical across them and that every legacy redirect exists
in both — drift there would ship a site with no security headers at all.

The CSP is `default-src 'self'` with no exceptions because the site genuinely
loads nothing external — no CDN, no font host, no analytics, no map embed.
HSTS is written but commented out: it must not be enabled until HTTPS is
confirmed on the apex and every subdomain, because a cached `max-age` cannot
be withdrawn from a browser that already has it.

## What is deliberately absent

No prices, no case studies, no client logos, no metrics, no
testimonials, no compliance badges, no awards. Every one of those is either
unapproved or does not exist. Sections that would carry them render a visible
build slot instead, and `verify:launch` fails while any slot remains.

The contact and scoping forms validate fully but do not claim to send, because
no delivery provider is configured. They say so and hand over a working email
address rather than showing a false success state.

## Blocking launch

| # | Blocker | Unblocked by |
| --- | --- | --- |
| 1 | Case-study evidence | Approved LT BBQ / CafeTC images, outcome sign-off, valid HTTPS on the CafeTC URL |
| 1b | ~~Decorative artwork~~ | **Done** — four generated pieces placed and optimised |
| 2 | Web-app and AI evidence | Any real screens; the services stay listed without them |
| 3 | Logo | A vector or ≥1200 px source; the palette is confirmed against it |
| 4 | ~~Phone number~~ | **Done** — all four observed numbers render, labelled. Owner should still confirm the two office lines are current |
| 5 | Prices and terms | Written approval of package price, inclusions, revisions, renewal |
| 6 | Form delivery | A provider and inbox; set `CONTACT_PROVIDER` in `.env` |
| 7 | Thai copy | Native-speaker review — still outstanding. A second developer pass fixed eight awkward constructions; the brief for the reviewer is [`docs/THAI-REVIEW.md`](docs/THAI-REVIEW.md) |
| 8 | Privacy notice | Drafted against PDPA s.23, s.24 and ss.30–36 in both locales. Needs eleven owner/counsel values and a review by a Thai practitioner — [`docs/PRIVACY-FILL.md`](docs/PRIVACY-FILL.md) |
| 9 | Legal entity | Exact registered name for the footer |

Asset specs and the owner approval checklist live in `assets-inbox/README.md`,
which is **not in this repository** — it carries unapproved commercial terms and
contact values belonging to the client. Same reason `instructions/` is absent.

## A note on TypeScript

The project compiles with **TypeScript 7.0.2**, as the handoff specifies.
typescript-eslint does not support TS 7 in any published tag — its peer range
caps at `<6.1.0` and it refuses to load — so **TypeScript 6.0.3 is installed
alongside** purely to give the linter an API it understands. `tsc` runs from
`node_modules/typescript7/bin/tsc`; ESLint resolves the bare `typescript`
package at 6.0.3. Tracking:
[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940).
Drop the side-by-side install once that lands.

## Notes

- Fonts are IBM Plex Sans / Sans Thai / Mono, self-hosted under the SIL OFL.
  Nunito Sans was ruled out: no Thai subset, which is fatal for a bilingual site.
- The page is fully readable with JavaScript blocked. The reveal animation
  starts visible and is only hidden once the script confirms it can show it
  again; the six-step scoping form falls back to all six steps on one page.
- All motion stops under `prefers-reduced-motion: reduce`.

## Engineer

Uvin Vindula (IAMUVIN) — [iamuvin.com](https://iamuvin.com) ·
[github.com/iamuvin](https://github.com/iamuvin)

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
