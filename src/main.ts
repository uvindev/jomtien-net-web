/**
 * @project  Jomtien Network — jomtien.net
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  MIT — see LICENSE
 *
 * The whole client island. Navigation, one reveal, the coastline rail, FAQ
 * markers, enquiry validation, and the scoping form. Nothing here is required
 * to read the page — every section is legible with this file blocked.
 */

/* ── IAMUVIN signature ──────────────────────────────────────────────────── */

const CHIP =
  "background:#F7931A;color:#0A0A0A;font-weight:bold;padding:4px 8px;border-radius:3px;";

let fired = false;

function signature(project?: string): void {
  if (fired || typeof window === "undefined") return;
  fired = true;
  console.log(
    `%c IAMUVIN ${project ? `· ${project} ` : ""}`,
    CHIP,
    "\nBuilt by Uvin Vindula — iamuvin.com"
  );
}

/* ── Motion ─────────────────────────────────────────────────────────────── */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>(".reveal");
  if (targets.length === 0) return;

  // Only hide content once we know we can show it again.
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    for (const el of targets) el.dataset.shown = "true";
    return;
  }

  document.documentElement.classList.add("js-motion");

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        if (el instanceof HTMLElement) el.dataset.shown = "true";
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  for (const el of targets) io.observe(el);
}

/**
 * Staggers each section's reveals so a group arrives in sequence rather than
 * snapping in together. Index is per-section and capped, so a long list never
 * ends up waiting a second and a half for its last row.
 */
function initStagger(): void {
  for (const section of document.querySelectorAll<HTMLElement>("section")) {
    const items = section.querySelectorAll<HTMLElement>(".reveal");
    items.forEach((el, i) => {
      el.style.setProperty("--i", String(Math.min(i, 6)));
    });
  }
}

/** Header settles into a tighter, opaque bar once the page has moved. */
function initHeader(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;
  let queued = false;
  const update = (): void => {
    queued = false;
    header.dataset.stuck = String(window.scrollY > 24);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
}

/**
 * Scroll progress. The bar is driven by a native scroll timeline where the
 * browser supports it — off the main thread, nothing for us to do. This only
 * runs where `animation-timeline` is missing.
 */
function initProgress(): void {
  const bar = document.querySelector<HTMLElement>(".scroll-progress");
  if (!bar) return;
  if (CSS.supports("animation-timeline: scroll()")) return;

  let queued = false;
  const update = (): void => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty("--progress", String(max > 0 ? window.scrollY / max : 0));
  };
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
}

/**
 * The ring trails the dot. That lag is the whole effect. Returns a setter that
 * takes a pointer position and starts the loop only while it has work to do.
 */
function cursorTrail(dot: HTMLElement, ring: HTMLElement): (x: number, y: number) => void {
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let rx = tx;
  let ry = ty;
  let running = false;

  const frame = (): void => {
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    if (Math.abs(tx - rx) > 0.1 || Math.abs(ty - ry) > 0.1) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  };

  return (x, y) => {
    tx = x;
    ty = y;
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };
}

/**
 * Custom cursor.
 *
 * DESIGN-SYSTEM.md rejects cursor replacement; this ships at the owner's
 * explicit instruction. It is gated to devices with a real pointer, disabled
 * under reduced motion, and it never runs on touch — where hiding the cursor
 * would do nothing useful and the listeners would just cost battery.
 */
function initCursor(): void {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine.matches || reducedMotion.matches) return;

  const dot = document.querySelector<HTMLElement>(".cursor-dot");
  const ring = document.querySelector<HTMLElement>(".cursor-ring");
  if (!dot || !ring) return;

  const root = document.documentElement;
  root.dataset.cursor = "on";
  const trail = cursorTrail(dot, ring);

  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      trail(event.clientX, event.clientY);
      const target = event.target;
      const actionable =
        target instanceof Element &&
        target.closest("a, button, summary, label, [role='button']") !== null;
      root.dataset.cursorState = actionable ? "action" : "idle";
    },
    { passive: true }
  );

  document.addEventListener("pointerdown", () => {
    ring.style.setProperty("opacity", "0.6");
  });
  document.addEventListener("pointerup", () => {
    ring.style.removeProperty("opacity");
  });
  document.addEventListener("mouseleave", () => {
    root.dataset.cursor = "off";
  });
  document.addEventListener("mouseenter", () => {
    root.dataset.cursor = "on";
  });
}

/** The coastline index tracks scroll depth through the page. */
function initRail(): void {
  const rail = document.querySelector<HTMLElement>("[data-rail]");
  if (!rail || reducedMotion.matches) return;

  const marks = [...rail.querySelectorAll<HTMLElement>(".rail-mark")];
  if (marks.length === 0) return;

  let queued = false;
  const update = (): void => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const active = Math.floor(progress * marks.length);
    marks.forEach((mark, i) => {
      mark.dataset.on = String(i <= active);
    });
  };

  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
}

/* ── Navigation ─────────────────────────────────────────────────────────── */

function initNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>("#navToggle");
  const panel = document.querySelector<HTMLElement>("#navPanel");
  if (!toggle || !panel) return;

  const setOpen = (open: boolean): void => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  panel.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    setOpen(false);
    toggle.focus();
  });
}

/** Swap the +/− marker. Open state is `details`, so this is presentation only. */
function initFaq(): void {
  for (const item of document.querySelectorAll<HTMLDetailsElement>("details")) {
    const marker = item.querySelector<HTMLElement>("summary > span");
    if (!marker) continue;
    item.addEventListener("toggle", () => {
      marker.textContent = item.open ? "−" : "+";
    });
  }
}

/* ── Enquiry form ───────────────────────────────────────────────────────── */

interface Rule {
  readonly field: string;
  readonly error: string;
  readonly message: string;
  readonly valid: (value: string, form: HTMLFormElement) => boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES: readonly Rule[] = [
  {
    field: "f-name",
    error: "e-name",
    message: "Enter the name we should reply to.",
    valid: (v) => v.trim().length > 0,
  },
  {
    field: "f-email",
    error: "e-email",
    message: "Enter an email address we can reach you on.",
    valid: (v) => EMAIL.test(v.trim()),
  },
  {
    field: "f-type",
    error: "e-type",
    message: "Choose the closest project type. We will correct it if it is wrong.",
    valid: (v) => v !== "",
  },
  {
    field: "f-msg",
    error: "e-msg",
    message: "Tell us what the business needs to do — at least a sentence or two.",
    valid: (v) => v.trim().length >= 20,
  },
  {
    field: "f-consent",
    error: "e-consent",
    message: "We need your agreement before we can store these details to reply.",
    valid: (_v, form) => {
      const box = form.querySelector<HTMLInputElement>("#f-consent");
      return box?.checked === true;
    },
  },
];

function showError(rule: Rule, form: HTMLFormElement, show: boolean): void {
  const input = form.querySelector<HTMLElement>(`#${rule.field}`);
  const slot = form.querySelector<HTMLElement>(`#${rule.error}`);
  if (!input || !slot) return;
  input.setAttribute("aria-invalid", String(show));
  slot.textContent = show ? rule.message : "";
  slot.hidden = !show;
}

function initEnquiry(): void {
  const form = document.querySelector<HTMLFormElement>("#enquiry");
  const status = document.querySelector<HTMLElement>("#formStatus");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Bots fill every field they find. A filled honeypot is silently dropped.
    const trap = form.querySelector<HTMLInputElement>("#f-website2");
    if (trap && trap.value !== "") return;

    const failures: Rule[] = [];
    for (const rule of RULES) {
      const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(
        `#${rule.field}`
      );
      const ok = rule.valid(input?.value ?? "", form);
      showError(rule, form, !ok);
      if (!ok) failures.push(rule);
    }

    const first = failures[0];
    if (first) {
      status.textContent = `${failures.length} ${
        failures.length === 1 ? "field needs" : "fields need"
      } attention. Nothing you typed has been lost.`;
      form.querySelector<HTMLElement>(`#${first.field}`)?.focus();
      return;
    }

    // No delivery provider is configured. Saying "sent" here would be a lie,
    // so the form reports the real state and hands over a working channel.
    // Wire CONTACT_PROVIDER per ENGINEERING-GUIDE.md, then replace this branch.
    status.textContent =
      "Message delivery is not connected on this preview yet. Nothing was sent. Please email info@jomtien.net and we will pick it up from there.";
  });
}

/* ── Scoping form ───────────────────────────────────────────────────────── */

/** FormData entries are `string | File | null`; only strings belong here. */
function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

/** The visitor's own answers, in reading order. Nothing computed. */
function summaryRows(form: HTMLFormElement): readonly (readonly [string, string])[] {
  const data = new FormData(form);
  const needs = data.getAll("needs").filter((v) => typeof v === "string");
  const or = (key: string): string => text(data, key) || "Not answered";
  return [
    ["Product", or("product")],
    ["Today", or("existing")],
    ["Must do", needs.length > 0 ? needs.join(", ") : "Nothing selected"],
    ["Content", or("content")],
    ["Timing", or("timing")],
    ["In your words", text(data, "message")],
  ];
}

function summaryRow([label, value]: readonly [string, string]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "border-t border-line-l pt-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6";
  const dt = document.createElement("dt");
  dt.className = "u-caps text-dim-l";
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.className = "mt-1 sm:mt-0";
  dd.textContent = value; // textContent, never innerHTML — this is visitor input
  wrap.append(dt, dd);
  return wrap;
}

interface ScopeUi {
  readonly form: HTMLFormElement;
  readonly steps: readonly HTMLFieldSetElement[];
  readonly back: HTMLButtonElement;
  readonly next: HTMLButtonElement;
  readonly send: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly bar: HTMLElement;
  readonly now: HTMLElement;
  readonly name: HTMLElement;
  readonly summary: HTMLElement | null;
  readonly out: HTMLElement | null;
}

/** Every element the stepped form needs, or null if this is not that page. */
function readScopeUi(): ScopeUi | null {
  const form = document.querySelector<HTMLFormElement>("#scope");
  const back = document.querySelector<HTMLButtonElement>("#scopeBack");
  const next = document.querySelector<HTMLButtonElement>("#scopeNext");
  const send = document.querySelector<HTMLButtonElement>("#scopeSend");
  const status = document.querySelector<HTMLElement>("#scopeStatus");
  const bar = document.querySelector<HTMLElement>("#stepBar");
  const now = document.querySelector<HTMLElement>("#stepNow");
  const name = document.querySelector<HTMLElement>("#stepName");
  if (!form || !back || !next || !send || !status || !bar || !now || !name) return null;

  const steps = [...form.querySelectorAll<HTMLFieldSetElement>(".scope-step")];
  if (steps.length === 0) return null;

  return {
    form, steps, back, next, send, status, bar, now, name,
    summary: document.querySelector<HTMLElement>("#scopeSummary"),
    out: document.querySelector<HTMLElement>("#scopeOut"),
  };
}

/** A step passes when every `required` control inside it is satisfied. */
function stepValid(step: HTMLFieldSetElement): boolean {
  const required = [
    ...step.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[required]"),
  ];
  if (required.length === 0) return true;

  const radios = required.filter((el) => el instanceof HTMLInputElement && el.type === "radio");
  const group = radios[0];
  if (group && !step.querySelector(`input[name="${group.name}"]:checked`)) return false;

  return required.every((el) => {
    if (el instanceof HTMLInputElement && el.type === "radio") return true;
    if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked;
    return el.value.trim().length >= (Number(el.getAttribute("minlength")) || 1);
  });
}

function renderScope(ui: ScopeUi, at: number): void {
  ui.steps.forEach((step, i) => {
    step.hidden = i !== at;
  });
  ui.back.hidden = at === 0;
  ui.next.hidden = at === ui.steps.length - 1;
  ui.send.hidden = at !== ui.steps.length - 1;
  ui.bar.style.width = `${((at + 1) / ui.steps.length) * 100}%`;
  ui.now.textContent = String(at + 1);
  ui.name.textContent = ui.steps[at]?.dataset.name ?? "";
  ui.status.textContent = "";
}

function bindScopeNav(ui: ScopeUi, state: { at: number }): void {
  ui.next.addEventListener("click", () => {
    const step = ui.steps[state.at];
    if (!step) return;
    if (!stepValid(step)) {
      ui.status.textContent = "Answer this one before moving on.";
      step.querySelector<HTMLElement>("input, textarea")?.focus();
      return;
    }
    state.at = Math.min(state.at + 1, ui.steps.length - 1);
    renderScope(ui, state.at);
    ui.steps[state.at]?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  });

  ui.back.addEventListener("click", () => {
    state.at = Math.max(state.at - 1, 0);
    renderScope(ui, state.at);
  });
}

function bindScopeSubmit(ui: ScopeUi, state: { at: number }): void {
  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const trap = ui.form.querySelector<HTMLInputElement>("#s-trap");
    if (trap && trap.value !== "") return;

    const step = ui.steps[state.at];
    if (step && !stepValid(step)) {
      ui.status.textContent =
        "Name, email, a description, and your agreement are needed before we can reply. Nothing you typed has been lost.";
      return;
    }

    // Play the answers back. This is the whole "result" — no invented number.
    if (ui.summary && ui.out) {
      ui.out.replaceChildren(...summaryRows(ui.form).map(summaryRow));
      ui.summary.hidden = false;
    }

    // No delivery provider configured — see ENGINEERING-GUIDE.md line 124.
    ui.status.textContent =
      "Delivery is not connected on this preview, so nothing was sent. Your summary is below — copy it into an email to info@jomtien.net and we will pick it up.";
    ui.summary?.scrollIntoView({
      block: "start",
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  });
}

/**
 * Six steps, one at a time. Every step is a real `fieldset` that exists in the
 * markup, so with the script blocked the visitor sees all six at once and can
 * still fill and read the whole thing. Nothing here computes a price — the
 * output is the visitor's own answers, played back.
 */
function initScope(): void {
  const ui = readScopeUi();
  if (!ui) return;
  const state = { at: 0 };
  bindScopeNav(ui, state);
  bindScopeSubmit(ui, state);
  renderScope(ui, state.at);
}

/* ── Boot ───────────────────────────────────────────────────────────────── */

signature("Jomtien Network");
initStagger();   // must set --i before initReveal starts observing
initReveal();
initRail();
initHeader();
initProgress();
initCursor();
initNav();
initFaq();
initEnquiry();
initScope();
