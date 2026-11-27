import { expect, test } from "@playwright/test";

const WORKSPACE_ROUTES = [
  "/dashboard",
  "/planner",
  "/indoor-air",
  "/sustainability",
  "/impact",
  "/community",
  "/assistant",
  "/profile",
  "/settings",
] as const;

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;

test.describe("Phase 01 & 01.1 Responsive UI/UX & Route Verification", () => {
  test("landing page supports dark-first theme, language toggles, and launches dashboard", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Breathe Smarter\./i })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: /Switch to light theme/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: /Switch language to Hindi/i }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: /समझदारी से सांस लें।/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /Switch language to English/i }).click();
    await page.getByRole("link", { name: /Launch Assistant/i }).first().click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("all nine workspace routes render cleanly with no page errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    for (const route of WORKSPACE_ROUTES) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("responsive viewports 360px to 1920px have zero horizontal overflow", async ({
    page,
  }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of ["/", ...WORKSPACE_ROUTES]) {
        await page.goto(route);
        const overflow = await page.evaluate(() => {
          return (
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth
          );
        });
        expect(
          overflow,
          `Unexpected horizontal overflow on ${route} at ${vp.name}`
        ).toBe(false);
      }
    }
  });

  test("mobile drawer opens and navigates at 360px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /Open navigation menu/i }).click();
    await page.getByRole("link", { name: /Ask Vayu AI/i }).first().click();
    await expect(page).toHaveURL(/\/assistant$/);
  });
});
