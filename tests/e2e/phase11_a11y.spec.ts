import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";

test.describe("Phase 11 — WCAG 2.2 AA Accessibility, Security Headers & Keyboard Checks", () => {
  test("key pages have 0 WCAG 2.2 AA axe-core violations across dark and light themes with 0 CSP/console errors", async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (err) => runtimeErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") runtimeErrors.push(msg.text());
    });

    await page.route("**/api/air-quality**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          forecast: getDemoForecast("new-delhi"),
        }),
      });
    });

    for (const theme of ["dark", "light"] as const) {
      await page.addInitScript((t) => {
        window.localStorage.setItem("vayuwise.theme.v1", t);
      }, theme);

      for (const routePath of ["/", "/dashboard", "/impact", "/profile", "/settings"]) {
        await page.goto(routePath);
        await page.waitForTimeout(600);
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          scan.violations,
          `Axe violations on ${routePath} (${theme})`
        ).toEqual([]);
      }
    }

    expect(runtimeErrors).toEqual([]);
  });

  test("security headers are present, X-Powered-By is omitted, keyboard Tab and lang=hi update work", async ({
    page,
    request,
  }) => {
    const homeRes = await request.get("/");
    expect(homeRes.status()).toBe(200);
    const headers = homeRes.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("geolocation=(self)");
    expect(headers["x-powered-by"]).toBeUndefined();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);

    await page.keyboard.press("Tab");
    const activeTag = await page.evaluate(
      () => document.activeElement?.tagName ?? ""
    );
    expect(activeTag.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: /हिन्दी|Hindi/i }).first().click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });
});
