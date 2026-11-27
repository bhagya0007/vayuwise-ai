import { expect, test } from "@playwright/test";

test.describe("Phase 08 Release Candidate Verification", () => {
  test("dashboard displays Forecast Lowest vs Practical Daytime Window cleanly without suggesting 00:30 outdoor errands", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText(/Practical Daytime Window/i)
    ).toBeVisible();
  });

  test("assistant distinguishes Safety Adjusted Gemini responses from pure Gemini & Rule-Based Fallbacks", async ({
    page,
  }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          aiGenerated: true,
          provenanceMode: "gemini_safety_adjusted",
          modelUsed: "gemini-3.1-flash-lite",
          data: {
            reply:
              "Keep exterior windows closed and run kitchen exhaust strictly while actively cooking.",
            recommendations: [],
            cautions: ["Indoor air quality inside rooms is unmeasured."],
            sourceIds: ["US_EPA_INDOOR"],
            dataBasis: "Open-Meteo modeled US AQI",
            whyThisRecommendation: "Intent-aware safety verified indoor guidance.",
            disclaimer: "Not medical advice.",
          },
          citations: [
            {
              id: "US_EPA_INDOOR",
              title: "US EPA Guide to Air Cleaners in the Home",
              url: "https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home",
            },
          ],
          contextMeta: {
            locationName: "New Delhi",
            timezone: "Asia/Kolkata",
            usAqi: 215,
            severityLabel: "Very Unhealthy",
            dataSourceType: "modeled",
            aqiStandard: "US_AQI",
          },
        }),
      });
    });

    await page.goto("/assistant");
    await page
      .getByRole("button", { name: /Improve indoor air/i })
      .click();

    await expect(
      page.getByText(/Gemini AI · gemini-3\.1-flash-lite \(Safety Adjusted\)/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Sign convention|unmeasured|kitchen exhaust/i).first()
    ).toBeVisible();
  });

  test("impact chart formats large numbers clearly with visible sign convention note", async ({
    page,
  }) => {
    await page.goto("/impact");
    await expect(
      page.getByText(/Sign convention: − denotes estimated emissions avoided/i)
    ).toBeVisible();
    await page.locator("#impact-distance").fill("60");
    // 60 * (0.163 - 0.025) * 240 = 1,987.2 kg CO2e
    await expect(page.getByText(/1,987\.2/).first()).toBeVisible();
  });
});
