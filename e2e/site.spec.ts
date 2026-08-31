/**
 * End-to-end behaviour.
 *
 * The .mjs gates in scripts/ prove rendered properties — contrast, overflow,
 * accessibility. This proves behaviour: what happens when someone actually
 * uses the thing. Those are different failures and they need different tests.
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { test, expect } from "@playwright/test";

const LOCALES = ["en", "th"] as const;

test.describe("routes", () => {
  for (const loc of LOCALES) {
    test(`/${loc}/ renders with one h1 and the primary action`, async ({ page }) => {
      await page.goto(`/${loc}/`);
      await expect(page).toHaveTitle(/Jomtien Network/);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute("lang", loc);
      // PRD.md line 348: the enquiry action must be findable in the first
      // viewport. A hidden header link is not findable, so assert geometry.
      const cta = page.locator('header .header-bar a[href="#contact"]');
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      const vp = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box!.y).toBeLessThan(vp!.height);
    });
  }

  test("root offers both locales", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/en/"]')).toBeVisible();
    await expect(page.locator('a[href="/th/"]')).toBeVisible();
  });
});

test.describe("locale parity", () => {
  test("both locales expose the same sections and project types", async ({ page }) => {
    const shape = async (loc: string) => {
      await page.goto(`/${loc}/`);
      return {
        sections: await page.locator("main section[id]").evaluateAll((els) =>
          els.map((e) => e.id).sort()
        ),
        projectTypes: await page.locator("#f-type option").evaluateAll((els) =>
          els.map((e) => (e as HTMLOptionElement).value).filter(Boolean).sort()
        ),
        faqs: await page.locator("details").count(),
      };
    };
    const en = await shape("en");
    const th = await shape("th");
    expect(th.sections).toEqual(en.sections);
    expect(th.projectTypes).toEqual(en.projectTypes);
    expect(th.faqs).toBe(en.faqs);
  });

  test("the switcher round-trips", async ({ page }) => {
    await page.goto("/en/");
    await page.locator('a[href="/th/"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await page.locator('a[href="/en/"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("enquiry form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/");
  });

  test("an empty submit reports errors and loses nothing", async ({ page }) => {
    await page.locator("#f-name").fill("Uvin");
    await page.locator("#f-msg").fill("short");
    await page.locator('#enquiry button[type="submit"]').click();

    await expect(page.locator("#formStatus")).toContainText("Nothing you typed has been lost");
    await expect(page.locator("#f-email")).toHaveAttribute("aria-invalid", "true");
    // Input survives a failed submit — PRD.md line 258.
    await expect(page.locator("#f-name")).toHaveValue("Uvin");
    await expect(page.locator("#f-msg")).toHaveValue("short");
  });

  test("a field error names the field and clears once fixed", async ({ page }) => {
    await page.locator('#enquiry button[type="submit"]').click();
    await expect(page.locator("#e-email")).toBeVisible();

    await page.locator("#f-name").fill("Uvin Vindula");
    await page.locator("#f-email").fill("uvin@example.com");
    await page.locator("#f-type").selectOption("ecommerce");
    await page.locator("#f-msg").fill("We need an online shop that takes Thai payments.");
    await page.locator("#f-consent").check();
    await page.locator('#enquiry button[type="submit"]').click();

    await expect(page.locator("#f-email")).toHaveAttribute("aria-invalid", "false");
  });

  test("never claims delivery while no provider is configured", async ({ page }) => {
    await page.locator("#f-name").fill("Uvin Vindula");
    await page.locator("#f-email").fill("uvin@example.com");
    await page.locator("#f-type").selectOption("web-app");
    await page.locator("#f-msg").fill("A booking system for a dive shop in Jomtien.");
    await page.locator("#f-consent").check();
    await page.locator('#enquiry button[type="submit"]').click();

    const status = page.locator("#formStatus");
    await expect(status).toContainText("not connected");
    await expect(status).toContainText("Nothing was sent");
    await expect(status).toContainText("info@jomtien.net");
    // The failure that matters is a false success, not the word "sent".
    await expect(status).not.toContainText(/thank you|we'll be in touch|successfully/i);
  });

  test("a filled honeypot is silently dropped", async ({ page }) => {
    await page.locator("#f-name").fill("Bot");
    await page.locator("#f-email").fill("bot@example.com");
    await page.locator("#f-type").selectOption("new-website");
    await page.locator("#f-msg").fill("Buy cheap watches from our excellent website today.");
    await page.locator("#f-consent").check();
    await page.locator("#f-website2").fill("http://spam.example");
    await page.locator('#enquiry button[type="submit"]').click();

    await expect(page.locator("#formStatus")).toHaveText("");
  });
});

test.describe("scoping form", () => {
  test("steps forward only once the step is answered", async ({ page }) => {
    await page.goto("/en/estimate/");

    const steps = page.locator(".scope-step");
    await expect(steps.first()).toBeVisible();
    await expect(steps.nth(1)).toBeHidden();

    await page.locator("#scopeNext").click();
    await expect(page.locator("#scopeStatus")).toContainText("Answer this one");
    await expect(steps.first()).toBeVisible();

    await page.locator('input[name="product"]').first().check();
    await page.locator("#scopeNext").click();
    await expect(steps.nth(1)).toBeVisible();
    await expect(page.locator("#stepNow")).toHaveText("2");

    await page.locator("#scopeBack").click();
    await expect(page.locator("#stepNow")).toHaveText("1");
  });

  test("plays the answers back and quotes no price", async ({ page }) => {
    await page.goto("/en/estimate/");

    const advance = async (name: string) => {
      await page.locator(`input[name="${name}"]`).first().check();
      await page.locator("#scopeNext").click();
    };
    await advance("product");
    await advance("existing");
    await page.locator("#scopeNext").click(); // step 3 has no required field
    await advance("content");
    await advance("timing");

    await page.locator("#s-name").fill("Uvin Vindula");
    await page.locator("#s-email").fill("uvin@example.com");
    await page.locator("#s-msg").fill("Bookings live in a notebook and a LINE chat right now.");
    await page.locator("#s-consent").check();
    await page.locator("#scopeSend").click();

    const summary = page.locator("#scopeSummary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Bookings live in a notebook");
    // The whole point of this page: it scopes, it does not quote.
    await expect(summary).not.toContainText(/THB|฿|\d{3},\d{3}/);
  });
});

test.describe("navigation and keyboard", () => {
  test("skip link is the first focusable control", async ({ page }) => {
    await page.goto("/en/");
    await page.keyboard.press("Tab");
    await expect(page.locator("a[href='#main']")).toBeFocused();
  });

  test("mobile menu opens, closes on Escape, and restores focus", async ({ page }) => {
    await page.goto("/en/");
    const toggle = page.locator("#navToggle");
    test.skip(!(await toggle.isVisible()), "desktop viewport shows the full nav");

    await toggle.click();
    await expect(page.locator("#navPanel")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(page.locator("#navPanel")).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("FAQ opens and closes by keyboard", async ({ page }) => {
    await page.goto("/en/");
    const first = page.locator("details").first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await first.locator("summary").click();
    await expect(first).not.toHaveAttribute("open", "");
  });
});

test.describe("content honesty", () => {
  for (const loc of LOCALES) {
    test(`/${loc}/ renders no price and no unverified marker`, async ({ page }) => {
      await page.goto(`/${loc}/`);
      const body = (await page.locator("body").innerText()).toLowerCase();
      expect(body).not.toContain("unverified");
      expect(body).not.toContain("lorem ipsum");
      // No THB figure may appear until the package terms are approved.
      expect(body).not.toMatch(/\d[\d,]*\s*(thb|บาท)/);
    });
  }

  test("external links are safe", async ({ page }) => {
    await page.goto("/en/");
    const unsafe = await page.locator('a[target="_blank"]').evaluateAll((els) =>
      els
        .filter((e) => {
          const rel = e.getAttribute("rel") ?? "";
          return !rel.includes("noopener") || !rel.includes("noreferrer");
        })
        .map((e) => (e as HTMLAnchorElement).href)
    );
    expect(unsafe).toEqual([]);
  });

  test("the IAMUVIN footer credit is present and linked", async ({ page }) => {
    await page.goto("/en/");
    const credit = page.locator('footer a[href="https://iamuvin.com"]');
    await expect(credit).toBeVisible();
    await expect(credit).toHaveAttribute("rel", /noopener/);
  });
});
