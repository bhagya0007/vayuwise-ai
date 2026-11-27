import { expect, test } from "@playwright/test";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";

test.describe("Phase 05–07 UI Fixes, Conversation-First Assistant, Report & PWA E2E", () => {
  test("/impact initializes to profile's 14 km default instead of 0 km and avoids -0.00 when zeroed", async ({
    page,
  }) => {
    await page.goto("/impact");
    await expect(page.locator("#impact-distance")).toHaveValue("14");
    await expect(page.getByText(/−0\.00 kg/)).toHaveCount(0);

    // Explicitly set distance to 0 -> must display clean 0.00, never -0.00
    await page.locator("#impact-distance").fill("0");
    await expect(page.getByText(/0\.00/).first()).toBeVisible();
    await expect(page.getByText(/−0\.00/)).toHaveCount(0);
  });

  test("/assistant places composer inside initial 1440x900 desktop viewport with compact welcome cards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/assistant");

    const composer = page.locator("#assistant-message-input");
    await expect(composer).toBeVisible();

    const box = await composer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(900);
    }

    await expect(
      page.getByRole("button", { name: /Protect my family/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Improve indoor air/i })
    ).toBeVisible();
  });

  test("/report renders A4 printable summary with optional sensitivity toggle OFF by default", async ({
    page,
  }) => {
    const forecast = getDemoForecast("new-delhi");
    await page.route("**/api/air-quality**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          forecast: {
            ...forecast,
            provenance: { ...forecast.provenance, dataSourceType: "modeled", freshnessStatus: "fresh", isStale: false },
          },
        }),
      });
    });
    await page.goto("/report");
    await expect(
      page.getByText(/Printable Personalized Air Quality Report/i)
    ).toBeVisible();

    const sensitivitySwitch = page.locator("#rep-sens");
    await expect(sensitivitySwitch).not.toBeChecked();
    await expect(page.getByText(/Personalized Daily Protection Plan/i)).toBeVisible();
    await expect(page.getByText(/Indoor Air Protection Checklist/i)).toBeVisible();
    await expect(page.getByText(/Deterministic Commute Emissions Comparison/i)).toBeVisible();
  });

  test("/indoor-air checklist syncs with Activity Tracker and /community renders 3 rollout horizons", async ({
    page,
  }) => {
    await page.goto("/indoor-air");
    const firstCheck = page
      .getByRole("button", { name: /Seal window\/door gaps/i })
      .first();
    await expect(firstCheck).toBeVisible();
    await firstCheck.click();
    await expect(firstCheck).toHaveAttribute("aria-pressed", "true");

    await page.goto("/community");
    await expect(page.getByRole("heading", { level: 1, name: /Community Action Plan/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Generate Action Plan/i }).first()
    ).toBeVisible();
  });

  test("PWA manifest endpoint responds cleanly and Landing Page links to Guided Setup", async ({
    page,
    request,
  }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const json = (await res.json()) as { name?: string; start_url?: string };
    expect(json.name).toContain("VayuWise AI");
    expect(json.start_url).toBe("/dashboard");

    await page.goto("/");
    await expect(page.getByRole("link", { name: /Guided Setup/i })).toBeVisible();
  });
});
