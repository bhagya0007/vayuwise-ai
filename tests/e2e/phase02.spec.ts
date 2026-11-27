import { expect, test } from "@playwright/test";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";

function buildMockForecast(cityId: string, name: string, country = "India") {
  const base = getDemoForecast(cityId);
  return {
    ...base,
    location: {
      ...base.location,
      name,
      country,
    },
    provenance: {
      ...base.provenance,
      sourceName: "Open-Meteo / CAMS",
      attributionLabel: "Current modeled air quality — Open-Meteo / CAMS",
      dataSourceType: "modeled",
      freshnessStatus: "fresh",
      isStale: false,
    },
  };
}

test.describe("Phase 02 Dashboard API & Location Flows", () => {
  test("searches and selects a city, updates dashboard, switches 48h forecast, and refreshes", async ({
    page,
  }) => {
    await page.route("**/api/locations/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          results: [
            {
              id: "om-2643743",
              name: "London",
              region: "England",
              country: "United Kingdom",
              countryCode: "GB",
              latitude: 51.5072,
              longitude: -0.1276,
              timezone: "Europe/London",
            },
          ],
        }),
      });
    });

    await page.route("**/api/air-quality**", async (route) => {
      const url = route.request().url();
      const forecast = url.includes("London")
        ? buildMockForecast("bengaluru", "London", "United Kingdom")
        : buildMockForecast("new-delhi", "New Delhi", "India");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, forecast }),
      });
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: "New Delhi" })
    ).toBeVisible();
    await expect(page.getByText(/Live Modeled · Open-Meteo \/ CAMS/i)).toBeVisible();

    // Search and select London
    const searchInput = page.getByRole("combobox", {
      name: /Search cities worldwide/i,
    });
    await searchInput.fill("London");
    await page.getByRole("option", { name: /London/i }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "London" })
    ).toBeVisible();

    // Switch forecast horizon to 48h and metric to PM2.5
    await page.getByRole("button", { name: "48h" }).click();
    await page.getByRole("button", { name: "PM₂.₅" }).click();

    // Trigger refresh
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(
      page.getByText(/Modeled air quality data refreshed/i)
    ).toBeVisible();
  });

  test("displays honest unavailable state on API error and allows explicit Demo Mode switch", async ({
    page,
  }) => {
    await page.route("**/api/air-quality**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          errorCode: "UPSTREAM_ERROR",
          message: "Simulated upstream outage",
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(
      page.getByText(/Live Air Quality Unavailable/i)
    ).toBeVisible();

    await page
      .getByRole("button", { name: /View Clearly Labeled Demo Mode/i })
      .click();

    await expect(
      page
        .locator("#workspace-main")
        .getByText(/Demo Data — Not Current Air Quality Readings/i)
    ).toBeVisible();
  });
});
