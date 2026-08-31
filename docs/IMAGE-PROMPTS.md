# Image generation prompts

Paste these into ChatGPT one at a time. Save each result into
`assets-inbox/generated/` using the filename in the heading, then run:

```bash
npm run images
```

That resizes, converts to AVIF + WebP + PNG fallback, writes them into
`public/images/`, and reports anything missing or undersized.

Every prompt below is locked to the real design tokens in `src/styles.css`. Do
not soften the negatives — they are the difference between artwork that looks
authored and artwork that looks like every AI hero background from 2024.

## Before you start

In ChatGPT, ask for the aspect ratio named in each prompt. If it returns
something with lettering in it, reply **"remove all text and lettering, keep
everything else identical"** and regenerate. Image models cannot set type; all
real text on this site is live HTML.

---

## 1. `hero-field.png` — 16:9, the hero background

Sits behind the headline on both locales. The CSS already draws angular facets;
this layer goes on top of them at low opacity to add depth and grain.

> Abstract editorial artwork for a software company website hero. Subject: an
> aerial coastline abstracted into a survey index — a long curved shoreline
> reduced to hard-edged angular facets and hairline measurement lines, as if a
> nautical chart were redrawn by a typographer. Large flat polygonal planes with
> crisp straight edges meeting at sharp angles; a few thin ruled lines crossing
> them like depth soundings.
>
> Palette strictly limited to these values: `#06171f` deep blue-green ink as the
> dominant ground covering roughly 70 percent of the frame, `#0a2430` and
> `#103240` for the facet planes, `#1677b2` and `#6cc6f2` for a small number of
> lit edges only, `#9edde8` for the very thinnest survey lines, and exactly one
> small marker in `#f2445b`. No colour outside this list.
>
> Composition: the centre and upper-left must stay dark and almost empty —
> headline text sits there. Concentrate all visual interest in the right third
> and along the bottom edge. Flat, matte, vector-like rendering with no
> texture noise.
>
> Negative: no gradient orbs or blurred colour blobs, no glassmorphism or
> frosted panels, no glowing neural-network nodes or connected-dot networks, no
> circuit-board patterns, no 3D device mockups, no palm trees, sunsets, beaches,
> boats or resort imagery, no neon, no lens flare, no bokeh, no glow effects, no
> drop shadows, no rounded corners, no text, letters, numbers or logos, no
> people, no watermark. 16:9.

---

## 2. `process-index.png` — 16:9, the process section

The signature idea made visual: the coastline rail resolving into four stages.
Optional — the section reads fine without it — but this is the image that would
make the premise land.

> Abstract technical diagram in the style of a nautical survey chart. Subject: a
> single continuous curved line running left to right across the frame, like a
> coastline traced from above, with exactly four square marker nodes spaced
> along it at uneven intervals. Each marker has short hairline ticks extending
> perpendicular from the line, and faint ruled grid lines behind everything.
> The line thickens very slightly from left to right.
>
> Palette strictly: `#06171f` as the ground, `#103240` for the background grid,
> `#9edde8` for the main coastline stroke, `#6cc6f2` for the tick marks, and the
> four markers in `#f2445b`. No other colour.
>
> Composition: generous empty space above and below the line. The line occupies
> the middle third vertically. Flat, precise, drafted — like an engineering
> drawing, not an illustration.
>
> Negative: no gradient orbs, no glassmorphism, no glowing nodes or network
> graphs, no circuit patterns, no 3D, no perspective, no shadows, no glow, no
> rounded corners, no text, numbers, labels or logos, no people, no decorative
> flourishes. 16:9.

---

## 3. `local-field.png` — 4:3, the local support section

Sits opposite the "Built in Jomtien, not offshore" copy. **This is abstract
geometry, not a photograph of a place.** A generated image that looks like a
real photo of Jomtien would be presenting an invented location as evidence next
to a factual claim. Keep it clearly abstract.

> Abstract geometric artwork derived from a coastal map. Subject: interlocking
> flat angular shapes suggesting a shoreline meeting water meeting land, read
> from directly above and heavily simplified — land masses as large dark
> polygons, water as lighter flat planes, with a few hairline contour lines
> following the edges. Reads as cartography, not as photography.
>
> Palette strictly: `#06171f` and `#0a2430` for the land polygons, `#103240` and
> `#1677b2` for the water planes, `#9edde8` for the contour hairlines, and one
> small `#f2445b` square marker positioned off-centre. No other colour.
>
> Composition: balanced, slightly asymmetric, filling the frame edge to edge.
> Flat matte vector rendering.
>
> Negative: no photographic realism, no beach, no sand, no waves, no palm trees,
> no sunset, no boats, no buildings, no people, no gradient orbs, no
> glassmorphism, no glow, no shadows, no 3D, no rounded corners, no text or
> labels, no compass rose, no logos. 4:3.

---

## 4. `chart-texture.png` — 1:1, seamless tile

A near-invisible paper grain that goes behind dark sections at very low opacity.
Must tile seamlessly. Keep it extremely subtle — if you can clearly see it in
the generated file, it is too strong, and I will reduce it on ingest anyway.

> Seamless tileable texture resembling aged nautical chart paper, viewed flat.
> Very fine irregular grain and a barely visible ruled grid. Extremely low
> contrast — almost flat. Monochrome in dark blue-green, built only from
> `#06171f` and `#0a2430`, with the faintest `#103240` grid lines.
>
> Must tile seamlessly with no visible seam at any edge. No focal point, no
> composition, completely even across the whole frame.
>
> Negative: no gradient, no vignette, no lighting variation, no stains, no torn
> edges, no coffee rings, no compass rose, no illustration, no text, no
> watermark, no visible seam. 1:1 square.

---

## What must NOT be generated

Two categories, and the line is not stylistic.

**Case-study evidence.** No generated before/after screenshots, website
mockups, dashboards, app screens, or product interfaces. The moment a generated
image sits in the Work section it is a claim that Jomtien Network built that
thing. It did not. Those slots stay empty until real approved screens arrive —
see the asset brief in `assets-inbox/README.md` (local only, not in this repository).

**Proof and identity.** No client logos, no team or office photos, no
certification badges, no award marks, no headshots for testimonials. Generated
versions of any of these are fabricated proof regardless of how they are
labelled.

**The logo is also not on this list** — a wordmark should be drawn, not
generated, and `CONTENT-AND-ASSETS.md` records that an original exists. Send
the real file.

## Social share images

Not generated. `og-en.png` and `og-th.png` are authored as SVG in
`assets/og/` and rendered to PNG with the site's own fonts and colours, because
image models cannot set type and these images are mostly type. Run
`npm run images` and they are produced along with everything else.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
