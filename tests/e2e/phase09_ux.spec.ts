import { expect, test } from "@playwright/test";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";

test.describe("Final UX Simplification & Progressive Disclosure Verification", () => {
  test("Landing page renders 5 concise sections with Get Started CTA and expandable methodology", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Breathe Smarter\. Live Greener\./i })
    ).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: /^Get Started$/i })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: /^Get Started$/i })).toBeVisible();
    await expect(page.locator("#how-it-works").getByText(/How It Works/i)).toBeVisible();

    const methodologyDetails = page.locator("details").filter({
      hasText: /Methodology & Data Sources/i,
    });
    await expect(methodologyDetails).toBeVisible();
    await expect(methodologyDetails).not.toHaveAttribute("open", "");
  });

  test("Workspace shell uses simplified sidebar navigation and mobile bottom navigation bar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    for (const label of [
      "Overview",
      "Daily Plan",
      "Ask Vayu AI",
      "Home Air",
      "Green Choices",
      "My Impact",
      "Community",
    ]) {
      await expect(page.locator("aside").getByRole("link", { name: label })).toBeVisible();
    }

    await page.setViewportSize({ width: 360, height: 800 });
    const mobileNav = page.locator('nav[aria-label="Mobile bottom navigation"]');
    await expect(mobileNav).toBeVisible();
    for (const label of ["Home", "Plan", "AI", "Impact"]) {
      await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(mobileNav.getByRole("button", { name: "More" })).toBeVisible();
  });

  test("Dashboard surfaces essential cards cleanly and tucks pollutant details into progressive disclosure", async ({
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
            provenance: {
              ...forecast.provenance,
              dataSourceType: "modeled",
              freshnessStatus: "fresh",
              isStale: false,
            },
          },
        }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    // 4 primary quick actions
    for (const action of [
      "Plan my day",
      "Improve home air",
      "Find green choices",
      "Calculate my impact",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    // Technical pollutant sparklines inside closed accordion by default
    const pollutantAccordion = page.locator("details").filter({
      hasText: /Pollutant Intelligence/i,
    });
    await expect(pollutantAccordion).toBeVisible();
    await expect(pollutantAccordion).not.toHaveAttribute("open", "");
  });

  test("Dashboard renders honest unavailable state on API failure and allows switching to clearly labeled Demo Mode", async ({
    page,
  }) => {
    await page.route("**/api/air-quality**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          message: "Simulated Open-Meteo timeout.",
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByText(/Live Air Quality Unavailable/i)).toBeVisible();
    await expect(page.getByText(/Simulated Open-Meteo timeout\./i)).toBeVisible();

    await page
      .getByRole("button", { name: /View Clearly Labeled Demo Mode/i })
      .click();
    await expect(
      page.getByText(/Demo Data — Not Current Air Quality Readings/i).first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan my day" }).first()).toBeVisible();
  });

  test("Sustainability displays 'Impact not quantified' for non-transport play swaps and only quantifies verified transport swaps", async ({
    page,
  }) => {
    await page.route("**/api/ai/sustainability", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          aiGenerated: true,
          provenanceMode: "gemini",
          modelUsed: "gemini-3.1-flash-lite",
          data: {
            headline: "Shift active play indoors and replace car commutes with Metro rail.",
            healthPriorityNote: "Current US AQI is Very Unhealthy; keep outdoor play indoors.",
            dataBasis: "Open-Meteo modeled US AQI",
            disclaimer: "Informational environmental guidance only.",
            alternatives: [
              {
                id: "alt-play-indoor",
                domain: "school_college_travel",
                currentActivity: "Outdoor morning walk or play",
                suggestedAlternative: "Indoor physical activity or quiet play",
                feasibility: "easy",
                relativeCost: "free",
                qualitativeEnvironmentalBenefit: "Prevents PM2.5 exposure for children indoors.",
                healthAndPracticalTradeOff: "Reduces outdoor play temporarily during smog.",
                sourceIds: ["WHO_AQG"],
                whyThisRecommendation: "Health protection comes first during high smog.",
              },
              {
                id: "alt-car-metro",
                domain: "daily_commute",
                currentActivity: "Daily solo petrol car commute",
                suggestedAlternative: "Switch to Delhi Metro rail",
                feasibility: "moderate",
                relativeCost: "low_cost",
                qualitativeEnvironmentalBenefit: "Lowers tailpipe and CO2e operational commute emissions.",
                healthAndPracticalTradeOff: "Enclosed transit reduces roadside pollution.",
                sourceIds: ["CEA_INDIA"],
                whyThisRecommendation: "Verified lower-emission electric rail commute.",
              },
            ],
          },
          citations: [],
        }),
      });
    });

    await page.goto("/sustainability");
    await page.getByRole("button", { name: /Suggest Alternatives/i }).first().click();

    await expect(page.getByText("Impact not quantified")).toBeVisible();
    await expect(page.getByText(/kg CO₂e\/yr avoided/i)).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Calculate Impact/i })).toHaveCount(1);
  });

  test("Impact Calculator displays simplified headings, Advanced Settings, How We Calculate This, and Exposure tab", async ({
    page,
  }) => {
    await page.goto("/impact");
    await expect(
      page.getByRole("heading", { level: 1, name: /Your Environmental Impact/i })
    ).toBeVisible();
    await expect(page.getByText(/Compare Your Travel Choices/i)).toBeVisible();

    const advancedDetails = page.locator("details").filter({
      hasText: /Advanced Settings/i,
    });
    await expect(advancedDetails).toBeVisible();
    await expect(advancedDetails).not.toHaveAttribute("open", "");

    await expect(
      page.getByRole("button", { name: /How We Calculate This/i })
    ).toBeVisible();

    await page
      .getByRole("tab", { name: /Outdoor Exposure Comparison/i })
      .click();
    await expect(
      page.getByText(/Outdoor Ambient Concentration-Time Comparison/i)
    ).toBeVisible();
  });

  test("Profile groups non-essential settings inside Advanced Preferences accordion", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page.locator("#profile-city")).toBeVisible();
    await expect(page.locator("#profile-distance")).toBeVisible();
    const advProfile = page.locator("details").filter({
      hasText: /Advanced Preferences/i,
    });
    await expect(advProfile).toBeVisible();
    await expect(advProfile).not.toHaveAttribute("open", "");
  });
});
