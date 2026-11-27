// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  buildRuleBasedGuidance,
  findRelativelyLowerExposureWindows,
  formatWindowRangeInTz,
} from "@/lib/air-quality/intelligence";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import { applyChatSafetyPolicy } from "@/lib/ai/safety";
import { formatAiRouteSuccess } from "@/lib/ai/route-helper";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { DEFAULT_FAMILY_PROFILE } from "@/lib/personalization/profile-storage";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { toOffsetIsoTimestamp } from "@/services/air-quality/open-meteo";
import type { AirQualityPoint } from "@/types/domain";

describe("Phase 08 Final QA: Practical Timing, Intent-Aware Safety, Provenance & DST/Midnight Boundaries", () => {
  test("never recommends 00:30 / midnight errands; separates forecast lowest vs practical daytime window & renders midnight dates", () => {
    const forecast = getDemoForecast("new-delhi");
    // Construct 24 hourly points in Asia/Kolkata (+05:30) where 00:30/00:00–02:00 is lowest (115),
    // but all daytime 07:00–20:00 hours stay >= 180
    const hourly: AirQualityPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = String(h).padStart(2, "0");
      const isOvernightLow = h === 0 || h === 1;
      const usAqi = isOvernightLow ? 115 : 190;
      hourly.push({
        timestampIso: `2026-11-27T${hourStr}:00:00+05:30`,
        usAqi,
        europeanAqi: null,
        pollutants: { pm25: 100, pm10: null, no2: null, so2: null, o3: null, co: null },
      });
    }
    forecast.hourly = hourly;

    const lower = findRelativelyLowerExposureWindows(hourly, 2, 24, {
      timezone: "Asia/Kolkata",
      profile: DEFAULT_FAMILY_PROFILE,
    });

    expect(lower.available).toBe(true);
    expect(lower.bestWindow?.averageUsAqi).toBe(115);
    expect(lower.practicalWindow).toBeNull();
    expect(lower.practicalWindowNoteEn).toMatch(/overnight forecast dips|postpone/i);

    const guidance = buildRuleBasedGuidance(
      forecast,
      DEFAULT_FAMILY_PROFILE,
      "en",
      lower
    );
    expect(guidance.recommendedPrimaryAction).not.toContain("00:00");
    expect(guidance.recommendedPrimaryAction).not.toContain("01:00");

    // Midnight boundary date display
    const crossMidnight = formatWindowRangeInTz(
      "2026-11-27T23:00:00+05:30",
      "2026-11-28T01:00:00+05:30",
      "Asia/Kolkata"
    );
    expect(crossMidnight).toMatch(/27 Nov.*28 Nov/);
  });

  test("prefers daytime practical window over midnight dip when afternoon dispersion improves", () => {
    const hourly: AirQualityPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = String(h).padStart(2, "0");
      const usAqi = h === 1 || h === 2 ? 75 : h === 14 || h === 15 ? 92 : 165;
      hourly.push({
        timestampIso: `2026-11-27T${hourStr}:00:00+05:30`,
        usAqi,
        europeanAqi: null,
        pollutants: { pm25: 35, pm10: null, no2: null, so2: null, o3: null, co: null },
      });
    }

    const lower = findRelativelyLowerExposureWindows(hourly, 2, 24, {
      timezone: "Asia/Kolkata",
      profile: DEFAULT_FAMILY_PROFILE,
    });

    expect(lower.bestWindow?.averageUsAqi).toBe(75);
    expect(lower.practicalWindow?.averageUsAqi).toBe(92);
    expect(lower.practicalWindow?.startIso).toContain("14:00");
  });

  test("applies intent-aware safety adjustments preserving safe Gemini indoor reply without commuting boilerplate", async () => {
    const forecast = getDemoForecast("new-delhi");
    forecast.current.usAqi = 220;
    const ctx = buildGeminiAirQualityContext(
      forecast,
      DEFAULT_FAMILY_PROFILE,
      "en"
    );

    const modelOutputWithBadCard = {
      reply:
        "Keep exterior windows closed during peak smog, run kitchen exhaust only while actively cooking, and damp-mop floors regularly.",
      recommendations: [
        {
          id: "rec-unsafe-indoor",
          category: "indoor_air",
          title: "Bathroom fan trick",
          suggestedAction:
            "An ordinary exhaust fan alone guarantees cleaner indoor air all day.",
          whyItMatters: "Simple ventilation.",
          suggestedTiming: "Always",
          expectedQualitativeBenefit: "Clean room air.",
          practicalAlternative: "Open windows at midnight.",
          relativeCost: "free" as const,
          effortLevel: "low" as const,
          caution: "None",
          sourceIds: ["US_EPA_INDOOR"],
          dataBasis: "Modeled US AQI 220",
          whyThisRecommendation: "Indoor question.",
        },
      ],
      cautions: ["Indoor levels inside your home are unmeasured."],
      sourceIds: ["US_EPA_INDOOR"],
      dataBasis: "Open-Meteo modeled",
      whyThisRecommendation: "Grounded indoor guidance.",
      disclaimer: "Informational only.",
    };

    const checked = applyChatSafetyPolicy(
      modelOutputWithBadCard,
      ctx,
      "How can I improve indoor air quality on a budget?",
      "en"
    );

    expect(checked.report.conservativeOverrideApplied).toBe(true);
    expect(checked.report.fullReplacement).toBe(false);
    // Safe reply preserved intact & NOT overwritten with generic commuting override
    expect(checked.data.reply).toContain("damp-mop floors");
    expect(checked.data.reply).not.toMatch(/open-road cycling/i);
    // Unsafe card replaced with domain-specific indoor guidance
    expect(checked.data.recommendations[0]?.suggestedAction).toMatch(
      /kitchen exhaust|HEPA|damp-mop/i
    );

    const routeRes = formatAiRouteSuccess({
      data: checked.data,
      aiGenerated: true,
      modelUsed: "gemini-3.1-flash-lite",
      latencyMs: 500,
      safety: checked.report,
      context: ctx,
    });
    const json = (await routeRes.json()) as {
      aiGenerated: boolean;
      provenanceMode: string;
    };
    expect(json.aiGenerated).toBe(true);
    expect(json.provenanceMode).toBe("gemini_safety_adjusted");
  });

  test("marks provenanceMode as rule_based_fallback when safety policy completely replaces an unsafe reply", async () => {
    const forecast = getDemoForecast("new-delhi");
    forecast.current.usAqi = 240;
    const ctx = buildGeminiAirQualityContext(
      forecast,
      DEFAULT_FAMILY_PROFILE,
      "en"
    );

    const unsafeReplyOutput = {
      reply:
        "Use an ozone generator and burn incense to purify indoor air, and open windows at midnight around 00:30.",
      recommendations: [],
      cautions: [],
      sourceIds: ["US_EPA_INDOOR"],
      dataBasis: "Modeled",
      whyThisRecommendation: "Unsafe sample",
      disclaimer: "Test",
    };

    const checked = applyChatSafetyPolicy(
      unsafeReplyOutput,
      ctx,
      "How do I keep indoor kitchen air clean?",
      "en"
    );

    expect(checked.report.fullReplacement).toBe(true);
    expect(checked.data.reply).not.toMatch(/open-road cycling|commute/i);
    expect(checked.data.reply).toMatch(/kitchen range exhaust|indoor air/i);

    const routeRes = formatAiRouteSuccess({
      data: checked.data,
      aiGenerated: true,
      modelUsed: "gemini-3.1-flash-lite",
      latencyMs: 450,
      safety: checked.report,
      context: ctx,
    });
    const json = (await routeRes.json()) as {
      aiGenerated: boolean;
      provenanceMode: string;
    };
    expect(json.aiGenerated).toBe(false);
    expect(json.provenanceMode).toBe("rule_based_fallback");
  });

  test("handles DST/offset fixture normalization and independently verifies audited emission reference math", () => {
    expect(toOffsetIsoTimestamp("2026-11-01T01:30", -14400)).toBe(
      "2026-11-01T01:30:00-04:00"
    );
    expect(toOffsetIsoTimestamp("2026-11-01T01:30", -18000)).toBe(
      "2026-11-01T01:30:00-05:00"
    );

    // Reference check: CNG Car (0.068 * 15 / 1 = 1.02 kg/day) vs Bus (0.015161 * 15 = 0.2274 kg/day)
    const cmp = compareTransportScenarios({
      baseline: {
        mode: "car_cng",
        roundTripDistanceKm: 15,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1,
      },
      alternative: {
        mode: "bus",
        roundTripDistanceKm: 15,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
    });
    expect(cmp.baseline.dailyKgCo2e).toBeCloseTo(1.02, 3);
    expect(cmp.alternative.dailyKgCo2e).toBeCloseTo(0.2274, 4);
    expect(cmp.avoidedAnnualKgCo2e).toBeCloseTo((1.02 - 0.227415) * 240, 1);
  });
});
