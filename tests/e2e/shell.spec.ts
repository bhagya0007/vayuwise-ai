import { expect, test } from "@playwright/test";

test.describe("Phase 00+ Application Shell", () => {
  test("renders VayuWise AI landing shell and toggles EN/HI", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByText("VayuWise AI", { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Breathe Smarter\. Live Greener\./i,
      })
    ).toBeVisible();

    await page.getByRole("button", { name: /Switch language to Hindi/i }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /समझदारी से सांस लें। हरित जीवन जिएं।/i,
      })
    ).toBeVisible();
  });

  test("health endpoint responds with ok status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.app).toBe("VayuWise AI");
    expect(typeof body.geminiConfigured).toBe("boolean");
  });
});
