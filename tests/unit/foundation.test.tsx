import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { AppShell } from "@/components/layout/AppShell";
import { getPublicEnv, getServerEnv } from "@/config/env";
import { getUsAqiBand } from "@/lib/constants/tokens";
import { familyProfileSchema } from "@/lib/schemas";

afterEach(() => {
  cleanup();
});

describe("VayuWise AI Phase 00 Foundation", () => {
  test("classifies US AQI bands accurately and prioritizes protection above 100", () => {
    const good = getUsAqiBand(42);
    expect(good.id).toBe("good");
    expect(good.prioritizeHealthProtection).toBe(false);

    const sensitive = getUsAqiBand(135);
    expect(sensitive.id).toBe("sensitive");
    expect(sensitive.prioritizeHealthProtection).toBe(true);

    const hazardous = getUsAqiBand(420);
    expect(hazardous.id).toBe("hazardous");
    expect(hazardous.prioritizeHealthProtection).toBe(true);
  });

  test("validates FamilyProfile schema boundaries", () => {
    const valid = familyProfileSchema.safeParse({
      householdAdults: 2,
      childrenCount: 1,
      seniorsCount: 1,
      hasRespiratorySensitivity: true,
      primaryCommute: "metro_rail",
      dailyCommuteKm: 18,
      hasHepaPurifier: false,
      canCrossVentilate: true,
      budgetTier: "low_cost",
      preferredLocale: "en",
    });
    expect(valid.success).toBe(true);

    const invalid = familyProfileSchema.safeParse({
      householdAdults: 0,
      childrenCount: -1,
      seniorsCount: 0,
      hasRespiratorySensitivity: false,
      primaryCommute: "metro_rail",
      dailyCommuteKm: 10,
      hasHepaPurifier: false,
      canCrossVentilate: true,
      budgetTier: "free",
      preferredLocale: "en",
    });
    expect(invalid.success).toBe(false);
  });

  test("blocks getServerEnv inside browser jsdom context", () => {
    expect(() => getServerEnv()).toThrow(/must only be called on the server/i);
    expect(getPublicEnv().NEXT_PUBLIC_APP_NAME).toBe("VayuWise AI");
  });

  test("renders AppShell and switches between English and Hindi", () => {
    render(<AppShell />);
    expect(screen.getByText("VayuWise AI")).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Location-aware air quality intelligence/i,
      })
    ).toBeDefined();

    const langButton = screen.getByRole("button", {
      name: /Switch language to Hindi/i,
    });
    fireEvent.click(langButton);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /सर्दियों के स्मॉग/i,
      })
    ).toBeDefined();
  });
});
