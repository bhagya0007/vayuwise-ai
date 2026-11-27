import { expect, test } from "@playwright/test";

test.describe("Final UX Simplification & Progressive Disclosure Verification", () => {
  test("Landing page renders 5 concise sections with Get Started CTA and expandable methodology", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Breathe Smarter\. Live Greener\./i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^Get Started$/i })).toBeVisible();
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
      hasText: /Current Pollutant Levels|Pollutant Intelligence/i,
    });
    await expect(pollutantAccordion).toBeVisible();
    await expect(pollutantAccordion).not.toHaveAttribute("open", "");
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
