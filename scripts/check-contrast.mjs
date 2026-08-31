/**
 * WCAG 2.2 contrast gate for the Jomtien Network palette.
 * Every pair the page actually renders is checked here, not by eye.
 * Exit 1 on any failure so it can sit in CI.
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

const T = {
  ink: "#06171f",
  ink2: "#0a2430",
  ink3: "#103240",
  paper: "#f4f7f9",
  paper2: "#e7eef2",
  coast: "#1677b2",
  coastLite: "#6cc6f2",
  water: "#9edde8",
  signal: "#d53c50",
  signalBright: "#f2445b",
  lineD: "#1b3a47",
  lineL: "#c9d6dd",
  borderL: "#81898d",
  dimD: "#93aab5",
  dimL: "#4f6d7a",
  white: "#ffffff",
  signalHover: "#b93245",
};

const srgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
};

const lum = (hex) => {
  const [r, g, b] = srgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** [label, foreground, background, minimum] */
const PAIRS = [
  ["body text on ink", T.paper, T.ink, 4.5],
  ["body text on raised ink", T.paper, T.ink2, 4.5],
  ["dim text on ink", T.dimD, T.ink, 4.5],
  ["dim text on raised ink", T.dimD, T.ink2, 4.5],
  ["accent word on ink", T.coastLite, T.ink, 4.5],
  ["index marks on ink", T.water, T.ink, 4.5],
  ["ghost button label on ink", T.paper, T.ink, 4.5],
  ["signal button label", T.white, T.signal, 4.5],
  ["signal button label, hover", T.white, T.signalHover, 4.5],
  ["body text on paper", T.ink, T.paper, 4.5],
  ["body text on paper raised", T.ink, T.paper2, 4.5],
  ["dim text on paper", T.dimL, T.paper, 4.5],
  ["link on paper", T.coast, T.paper, 4.5],
  ["dark button label on paper", T.paper, T.ink, 4.5],
  ["coast button label", T.white, T.coast, 4.5],
  // Non-text contrast — borders and focus rings, WCAG 2.2 1.4.11 wants 3:1.
  ["control border on paper", T.borderL, T.white, 3],
  ["control border on paper-2", T.borderL, T.paper2, 3],
  ["focus ring on ink", T.coastLite, T.ink, 3],
  ["focus ring on paper", T.coast, T.paper, 3],
  ["bright signal mark on ink", T.signalBright, T.ink, 3],
  ["rule on ink", T.lineD, T.ink, 1.2],
];

let failed = 0;
console.log("CONTRAST GATE — WCAG 2.2");
console.log("-".repeat(52));
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${label}`
  );
}
console.log("-".repeat(52));
console.log(failed === 0 ? "CONTRAST OK" : `${failed} PAIR(S) BELOW MINIMUM`);
process.exit(failed === 0 ? 0 : 1);
