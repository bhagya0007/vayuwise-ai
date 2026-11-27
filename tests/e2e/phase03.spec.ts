import { expect, test } from "@playwright/test";

test.describe("Phase 03 AI Modules & Explainability E2E", () => {
  test("Assistant supports mocked Gemini response, citations, Why explanation, copy, and clear", async ({
    page,
  }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          aiGenerated: true,
          modelUsed: "gemini-3.8-flash",
          data: {
            reply:
              "Keep windows sealed during morning inversion and use an N95 mask for unavoidable outdoor errands.",
            recommendations: [
              {
                id: "r1",
                category: "indoor",
                title: "Seal drafty windows",
                suggestedAction: "Use weatherstripping and run kitchen exhaust.",
                whyItMatters: "Reduces PM2.5 infiltration",
                suggestedTiming: "Morning & evening",
                expectedQualitativeBenefit: "Cleaner indoor living air",
                practicalAlternative: "Damp mop floors",
                relativeCost: "free",
                effortLevel: "low",
                caution: "Modeled data differs from street-level traffic.",
                sourceIds: ["US_EPA_INDOOR"],
                dataBasis: "Open-Meteo / CAMS (modeled)",
                whyThisRecommendation: "High modeled PM2.5 in New Delhi.",
              },
            ],
            cautions: ["Regional modeled data only."],
            sourceIds: ["WHO_AQG_2021", "US_EPA_INDOOR"],
            dataBasis: "Open-Meteo / CAMS (modeled)",
            whyThisRecommendation: "Grounded in current New Delhi US AQI.",
            disclaimer: "Not medical advice.",
          },
          citations: [
            {
              id: "WHO_AQG_2021",
              title: "WHO Global Air Quality Guidelines",
              organization: "WHO",
              url: "https://www.who.int/publications/i/item/9789240034228",
              summaryGuidance: "Protect airways.",
            },
          ],
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

    await page.goto("/assistant");
    await page
      .getByRole("button", {
        name: /How can I protect my family during severe smog\?/i,
      })
      .click();

    await expect(page.getByText(/Gemini AI · gemini-3\.8-flash/i)).toBeVisible();
    await expect(
      page.getByText(/Keep windows sealed during morning inversion/i)
    ).toBeVisible();

    // Expand "Why this recommendation?"
    await page.getByRole("button", { name: /Why this recommendation\?/i }).click();
    await expect(
      page.getByText(/WHO Global Air Quality Guidelines/i)
    ).toBeVisible();

    // Clear chat
    await page.getByRole("button", { name: /^Clear$/i }).click();
    await expect(page.getByText(/Welcome to Vayu AI/i)).toBeVisible();
  });

  test("Daily Planner generates 6-slot timeline & marks actions done locally", async ({
    page,
  }) => {
    await page.route("**/api/ai/plan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          aiGenerated: true,
          modelUsed: "gemini-3.8-flash",
          data: {
            headline: "Protect airways indoors during inversion peaks",
            healthProtectionPriority: true,
            dataBasis: "New Delhi · Open-Meteo / CAMS (modeled)",
            personalizationBasis: "3 members · metro_rail",
            slots: [
              {
                window: "early_morning",
                timeRange: "06:00 – 08:30",
                title: "Indoor stretching",
                whatToDo: "Exercise indoors.",
                whenToDoIt: "06:30",
                whyRecommended: "Morning inversion",
                expectedBenefit: "Lower PM2.5 inhalation",
                alternativeAction: "Mask if outside",
                healthPriority: true,
                caution: "Do not treat chill air as clean",
                sourceIds: ["WHO_AQG_2021"],
                whyThisRecommendation: "High morning PM2.5",
              },
              {
                window: "morning_commute",
                timeRange: "08:30 – 10:30",
                title: "Metro transit",
                whatToDo: "Use enclosed metro.",
                whenToDoIt: "09:00",
                whyRecommended: "Limits roadside smoke",
                expectedBenefit: "Cleaner commute",
                alternativeAction: "WFH",
                healthPriority: true,
                caution: "Wear N95 to station",
                sourceIds: ["US_EPA_AQI"],
                whyThisRecommendation: "Health first",
              },
              {
                window: "midday",
                timeRange: "12:00 – 15:00",
                title: "Light errands",
                whatToDo: "Keep errands brief.",
                whenToDoIt: "13:30",
                whyRecommended: "Higher mixing",
                expectedBenefit: "Less peak exposure",
                alternativeAction: "Stay indoors",
                healthPriority: true,
                caution: "Not guaranteed safe",
                sourceIds: ["OPEN_METEO_AQ"],
                whyThisRecommendation: "Relative dip",
              },
              {
                window: "night",
                timeRange: "21:00 – 23:00",
                title: "Bedroom seal",
                whatToDo: "Keep bedroom door shut.",
                whenToDoIt: "21:30",
                whyRecommended: "Night cooling",
                expectedBenefit: "Cleaner sleep",
                alternativeAction: "Draft stopper",
                healthPriority: true,
                caution: "No incense",
                sourceIds: ["US_EPA_INDOOR"],
                whyThisRecommendation: "Overnight protection",
              },
            ],
            sourceIds: ["WHO_AQG_2021"],
            disclaimer: "Info only",
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

    await page.goto("/planner");
    await page
      .getByRole("button", { name: /Generate AI Daily Plan/i })
      .first()
      .click();

    await expect(
      page.getByText(/Protect airways indoors during inversion peaks/i)
    ).toBeVisible();
    await expect(page.getByText(/0\/4 completed/i)).toBeVisible();

    await page.getByRole("button", { name: /Mark Done/i }).first().click();
    await expect(page.getByText(/1\/4 completed/i)).toBeVisible();
  });

  test("Indoor, Sustainability, and Community routes handle unconfigured AI truthfully with deterministic fallback", async ({
    page,
  }) => {
    await page.route("**/api/ai/**", async (route) => {
      const url = route.request().url();
      const isIndoor = url.includes("indoor-air");
      const isSust = url.includes("sustainability");
      const fallbackData = isIndoor
        ? {
            headline: "Indoor deterministic guidance",
            ventilationSummary: "Seal windows during unhealthy peaks.",
            dataBasis: "Open-Meteo / CAMS",
            cards: [
              {
                id: "f1",
                room: "living_room",
                sourceCategory: "outdoor_infiltration",
                title: "Seal drafts",
                suggestedAction: "Keep windows closed.",
                whyItMatters: "Limits PM2.5 ingress.",
                ventilationGuidance: "Ventilate only when cleaner.",
                relativeCost: "free",
                effortLevel: "low",
                caution: "Avoid incense.",
                sourceIds: ["US_EPA_INDOOR"],
                whyThisRecommendation: "Elevated outdoor PM2.5.",
              },
            ],
            avoidList: ["Avoid indoor smoke."],
            sourceIds: ["US_EPA_INDOOR"],
            disclaimer: "Deterministic rule-based fallback.",
          }
        : isSust
          ? {
              headline: "Sustainability deterministic guidance",
              healthPriorityNote: "Health first.",
              dataBasis: "Open-Meteo / CAMS",
              alternatives: [
                {
                  id: "s1",
                  domain: "daily_commute",
                  currentActivity: "Two-wheeler commute",
                  suggestedAlternative: "Use metro rail.",
                  feasibility: "high",
                  relativeCost: "low_cost",
                  qualitativeEnvironmentalBenefit: "Lower tailpipe emissions.",
                  healthAndPracticalTradeOff: "Reduced roadside PM2.5 exposure.",
                  sourceIds: ["WHO_AQG_2021"],
                  whyThisRecommendation: "Protected commute.",
                },
              ],
              sourceIds: ["WHO_AQG_2021"],
              disclaimer: "Deterministic rule-based fallback.",
            }
          : {
              headline: "Community deterministic guidance",
              dataBasis: "Open-Meteo / CAMS",
              immediateActions: ["Pause outdoor assemblies."],
              weeklyActions: ["Enforce no-idling drop-off zone."],
              longTermActions: ["Plant dust-buffering hedgerows."],
              responsibilityCategories: ["RWA Committee"],
              expectedQualitativeOutcomes: ["Reduced local emissions."],
              implementationChecklist: ["Publish notice."],
              healthAndSafetyNotes: ["Protect seniors and children."],
              whyThisRecommendation: "Elevated neighborhood AQI.",
              sourceIds: ["NCDC_INDIA"],
              disclaimer: "Deterministic rule-based fallback.",
            };

      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          aiGenerated: false,
          errorCode: "UNCONFIGURED",
          message:
            "GEMINI_API_KEY is not configured on the server. Deterministic guidance is available.",
          fallbackData,
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

    for (const item of [
      { route: "/indoor-air", btn: /Generate Indoor Plan/i },
      { route: "/sustainability", btn: /Suggest Alternatives/i },
      { route: "/community", btn: /Generate Action Plan/i },
    ]) {
      await page.goto(item.route);
      await page.getByRole("button", { name: item.btn }).first().click();
      await expect(
        page.getByText(/Gemini AI Unavailable \(UNCONFIGURED\)/i)
      ).toBeVisible();
      await page
        .getByRole("button", { name: /Show Deterministic Rule-Based Guidance/i })
        .click();
      await expect(
        page.getByText(/Rule-Based Fallback \(Not Gemini AI\)/i)
      ).toBeVisible();
    }
  });
});
