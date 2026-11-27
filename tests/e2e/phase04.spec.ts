import { expect, test } from "@playwright/test";

test.describe("Phase 04 Personalization, Onboarding, Impact Engine & Activity Tracker E2E", () => {
  test("completes 6-step onboarding and persists profile preferences across reload", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByText(/Personalize VayuWise AI to Your Routine/i)
    ).toBeVisible();

    // Step 1: Select Gurugram -> Continue
    await page.getByRole("button", { name: /Gurugram/i }).click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 2: Select Student -> Continue
    await page.getByRole("button", { name: /^Student/i }).click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 3: Schedule -> Continue
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 4: Commute Setup -> set 22 km -> Continue
    await page.locator("#ob-dist").fill("22");
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 5: Indoor Environment -> Continue
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 6: Finish
    await page.getByRole("button", { name: /Save & Launch Workspace/i }).click();
    await page.waitForURL("**/dashboard");

    // Verify Gurugram persisted in profile & dashboard
    await page.goto("/profile");
    await expect(page.locator("#profile-distance")).toHaveValue("22");
    await expect(page.locator("#profile-lifestyle")).toHaveValue("student");
  });

  test("profile save, reset, and delete local data controls update stored state", async ({
    page,
  }) => {
    await page.goto("/profile");
    await page.locator("#profile-lifestyle").selectOption("working_professional");
    await page.locator("#profile-distance").fill("18");
    await page.locator("#profile-occupancy").fill("2");
    await page.getByRole("button", { name: /Save Preferences/i }).click();
    await expect(page.getByText(/18 km\/day/i)).toBeVisible();

    await page.reload();
    await expect(page.locator("#profile-distance")).toHaveValue("18");
    await expect(page.locator("#profile-lifestyle")).toHaveValue(
      "working_professional"
    );

    await page.getByRole("button", { name: /Delete All Local Data/i }).click();
    await expect(page.locator("#profile-distance")).toHaveValue("14");
  });

  test("Impact Lab supports mode comparisons, what-if presets, methodology disclosure, activity tracker persistence & duplicate prevention", async ({
    page,
  }) => {
    // Open with pre-populated URL query params (simulating Sustainability cross-link)
    await page.goto("/impact?baseline=car_petrol&alternative=metro_rail&distance=20");
    await expect(page.getByRole("heading", { level: 1, name: /Your Environmental Impact/i })).toBeVisible();

    // 20 * (0.163 - 0.025) * 5 * 48 = 662.4 kg CO2e annual savings
    await expect(page.getByText(/662\.4/).first()).toBeVisible();

    // Expand methodology drawer and confirm cited sources visible
    await page
      .getByRole("button", { name: /How We Calculate This/i })
      .click();
    await expect(page.getByText(/All 12 Documented Modes/i)).toBeVisible();

    // Test What-If preset: Bus -> Petrol Car negative savings
    await page.getByRole("button", { name: /Bus → Petrol Car/i }).click();
    await expect(
      page.getByText(/Estimated Operational CO2e Increase/i)
    ).toBeVisible();

    // Switch back to Metro preset & record completed activity
    await page.getByRole("button", { name: /Petrol Car vs Metro/i }).click();
    await page.locator("#act-title").fill("Metro commute today");
    await page.getByRole("button", { name: /Log Completed Action/i }).click();
    await expect(page.getByText(/Metro commute today/i)).toBeVisible();

    // Duplicate same-day same action prevented cleanly
    await page.getByRole("button", { name: /Log Completed Action/i }).click();
    await expect(
      page.getByText(/duplicate counting prevented/i)
    ).toBeVisible();

    // Reload and verify persisted progress remains
    await page.reload();
    await expect(page.getByText(/Metro commute today/i)).toBeVisible();
  });

  test("Sustainability Hub offers Calculate Impact cross-module link and works on mobile viewport", async ({
    page,
  }) => {
    await page.route("**/api/ai/sustainability", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          aiGenerated: true,
          modelUsed: "gemini-3.1-flash-lite",
          data: {
            headline: "Switch solo petrol trips to Metro Rail",
            healthPriorityNote: "Enclosed metro reduces roadside dust inhalation.",
            dataBasis: "Open-Meteo / CAMS",
            alternatives: [
              {
                id: "s1",
                domain: "daily_commute",
                currentActivity: "Solo petrol car",
                suggestedAlternative: "Use enclosed Metro Rail",
                feasibility: "high",
                relativeCost: "low_cost",
                qualitativeEnvironmentalBenefit: "Lowers transport emissions per trip.",
                healthAndPracticalTradeOff: "Less open-road PM2.5 exposure.",
                sourceIds: ["WHO_AQG_2021"],
                whyThisRecommendation: "Matched commute distance.",
              },
            ],
            sourceIds: ["WHO_AQG_2021"],
            disclaimer: "Qualitative advice.",
          },
          citations: [],
          contextMeta: {
            locationName: "New Delhi",
            timezone: "Asia/Kolkata",
            usAqi: 195,
            severityLabel: "Unhealthy",
            dataSourceType: "modeled",
            aqiStandard: "US_AQI",
          },
        }),
      });
    });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/sustainability");
    await page.getByRole("button", { name: /Suggest Alternatives/i }).first().click();

    const calcLink = page.getByRole("link", { name: /Calculate Impact/i }).first();
    await expect(calcLink).toBeVisible();
    await calcLink.click();
    await page.waitForURL("**/impact**");
    await expect(page.getByRole("heading", { level: 1, name: /Your Environmental Impact/i })).toBeVisible();
  });
});
