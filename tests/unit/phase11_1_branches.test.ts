// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  applyChatSafetyPolicy,
  applyCommunitySafetyPolicy,
  applyDailyPlanSafetyPolicy,
  applyIndoorSafetyPolicy,
  applySustainabilitySafetyPolicy,
} from "@/lib/ai/safety";
import {
  buildDeterministicChatFallback,
  buildDeterministicCommunityFallback,
  buildDeterministicDailyPlanFallback,
  buildDeterministicIndoorFallback,
  buildDeterministicSustainabilityFallback,
} from "@/lib/ai/fallbacks";
import {
  isAllowedOrigin,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import {
  buildAirQualityInsights,
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  evaluateDataFreshness,
  findRelativelyLowerExposureWindows,
  summarizeForecast,
} from "@/lib/air-quality/intelligence";
import { clearMemoryCacheForTests } from "@/lib/cache/memory-cache";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { EMISSION_FACTOR_REGISTRY } from "@/lib/impact/emission-factors";
import { compareOutdoorConcentrationTime } from "@/lib/impact/exposure-calculator";
import {
  calculateTransportScenario,
  compareTransportScenarios,
} from "@/lib/impact/transport-calculator";
import { buildNormalizedPersonalizationContext } from "@/lib/personalization/engine";
import { DEFAULT_FAMILY_PROFILE } from "@/lib/personalization/profile-storage";
import { OpenMeteoAirQualityService } from "@/services/air-quality/open-meteo";
import type { FamilyProfile } from "@/types/domain";

const ORIGINAL_FETCH = global.fetch;

describe("Phase 11.1 — Critical Logic Branch Coverage, Sources & Edge Boundaries", () => {
  beforeEach(() => {
    clearMemoryCacheForTests();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  test("verifies all 12 emission factor units, gasBasis, occupancy rules, and zero-baseline division safety", () => {
    expect(Object.keys(EMISSION_FACTOR_REGISTRY)).toHaveLength(12);
    expect(EMISSION_FACTOR_REGISTRY.car_electric.numericalFactorKgCo2e).toBeCloseTo(
      0.15 * 0.727,
      5
    );
    expect(EMISSION_FACTOR_REGISTRY.two_wheeler_electric.numericalFactorKgCo2e).toBeCloseTo(
      0.025 * 0.727,
      5
    );
    expect(EMISSION_FACTOR_REGISTRY.bus.basis).toBe("passenger_km");
    expect(EMISSION_FACTOR_REGISTRY.metro_rail.basis).toBe("passenger_km");

    // Passenger-km modes are never re-divided by occupancy
    const bus = calculateTransportScenario({
      mode: "bus",
      roundTripDistanceKm: 10,
      travelDaysPerWeek: 5,
      workingWeeksPerYear: 50,
      occupancy: 1,
    });
    expect(bus.dailyKgCo2e).toBeCloseTo(0.1516, 4);

    // Invalid occupancy for two-wheeler (maxOccupancy = 2)
    expect(() =>
      calculateTransportScenario({
        mode: "two_wheeler",
        roundTripDistanceKm: 10,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 4,
      })
    ).toThrow(/Invalid occupancy/);

    // Zero baseline avoids NaN / Infinity percentageChange
    const zeroToPetrol = compareTransportScenarios({
      baseline: {
        mode: "walk",
        roundTripDistanceKm: 5,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
      alternative: {
        mode: "car_petrol",
        roundTripDistanceKm: 5,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1,
      },
    });
    expect(zeroToPetrol.percentageChange).toBeNull();
    expect(zeroToPetrol.isNegativeSavings).toBe(true);
    expect(zeroToPetrol.percentageNote).toContain("undefined");
  });

  test("covers exposure-calculator duration errors, missing PM2.5, stale warnings, and positive/negative deltas", () => {
    const baseCommon = {
      baselineHourIso: "2026-11-27T08:00:00+05:30",
      alternativeHourIso: "2026-11-27T14:00:00+05:30",
      baselineUsAqi: 185,
      alternativeUsAqi: 110,
      isStaleForecast: false,
      dataSourceType: "modeled" as const,
    };

    const shortDurHi = compareOutdoorConcentrationTime({
      ...baseCommon,
      durationHours: 0.1,
      baselinePm25UgM3: 100,
      alternativePm25UgM3: 40,
      locale: "hi",
    });
    expect(shortDurHi.valid).toBe(false);
    expect(shortDurHi.warningMessage).toContain("0.25");

    const missingPm25 = compareOutdoorConcentrationTime({
      ...baseCommon,
      durationHours: 2,
      baselinePm25UgM3: null,
      alternativePm25UgM3: 40,
      locale: "en",
    });
    expect(missingPm25.valid).toBe(false);
    expect(missingPm25.warningMessage).toContain("US AQI");

    const staleHigh = compareOutdoorConcentrationTime({
      baselineHourIso: "2026-11-27T08:00:00+05:30",
      alternativeHourIso: "2026-11-27T14:00:00+05:30",
      durationHours: 2,
      alternativeDurationHours: 1,
      baselinePm25UgM3: 140,
      alternativePm25UgM3: 90,
      baselineUsAqi: 195,
      alternativeUsAqi: 170,
      isStaleForecast: true,
      dataSourceType: "stale",
      locale: "en",
    });
    expect(staleHigh.valid).toBe(true);
    expect(staleHigh.baselineConcentrationTimeUgHrM3).toBe(280);
    expect(staleHigh.alternativeConcentrationTimeUgHrM3).toBe(90);
    expect(staleHigh.differenceUgHrM3).toBe(190);
    expect(staleHigh.healthProtectionPriority).toBe(true);
  });

  test("covers personalization context branches across lifestyles, schedules, locales, and AQI thresholds", () => {
    const forecast = getDemoForecast("new-delhi");
    const categories: NonNullable<FamilyProfile["lifestyleCategory"]>[] = [
      "individual",
      "student",
      "working_professional",
      "family_household",
      "senior_citizen",
      "community_representative",
      "outdoor_fitness",
    ];
    const schedules: NonNullable<FamilyProfile["workScheduleMode"]>[] = [
      "onsite",
      "hybrid",
      "remote",
      "student_schedule",
      "flexible",
    ];

    for (const [idx, cat] of categories.entries()) {
      const ctx = buildNormalizedPersonalizationContext({
        profile: {
          ...DEFAULT_FAMILY_PROFILE,
          lifestyleCategory: cat,
          workScheduleMode: schedules[idx % schedules.length],
          sensitivityOptIn: idx % 2 === 0,
          hasRespiratorySensitivity: idx % 2 === 0,
          primaryCommute: idx % 2 === 0 ? "carpool" : "walk_cycle",
          vehicleOccupancy: 4,
          budgetTier: idx % 3 === 0 ? "free" : "investment",
        },
        location: forecast.location,
        forecast: idx === 0 ? null : forecast,
        locale: idx % 2 === 0 ? "hi" : "en",
      });
      expect(ctx.appliedPreferenceLabels.length).toBeGreaterThan(0);
    }
  });

  test("covers all safety policy violation paths (diagnosis, guaranteed safe, sustainability, community) in EN/HI", () => {
    const forecast = getDemoForecast("new-delhi");
    forecast.current.usAqi = 260;
    const ctx = buildGeminiAirQualityContext(forecast, DEFAULT_FAMILY_PROFILE, "en");

    // Chat diagnosis claim -> triggers conservative intent-aware override
    const diagChat = applyChatSafetyPolicy(
      {
        ...buildDeterministicChatFallback(ctx, "hi"),
        reply: "You definitely have asthma; take steroids immediately.",
      },
      ctx,
      "मुझे खांसी है क्या मैं दौड़ने जाऊं?",
      "hi"
    );
    expect(diagChat.report.conservativeOverrideApplied).toBe(true);
    expect(diagChat.report.violations).toContain("medical_diagnosis_or_treatment_claim");

    // Daily plan clean vs unsafe outdoor play in Hindi
    const unsafePlan = buildDeterministicDailyPlanFallback(ctx, "hi");
    unsafePlan.slots[0].whatToDo = "Go for a run outdoors and enjoy zero risk air.";
    const safePlan = applyDailyPlanSafetyPolicy(unsafePlan, ctx, "hi");
    expect(safePlan.report.violations).toContain("guaranteed_safe_air_claim");
    expect(safePlan.report.violations).toContain("unsafe_outdoor_exertion_during_high_aqi");

    // Indoor houseplants claim + Hindi override
    const unsafeIndoor = buildDeterministicIndoorFallback(ctx);
    unsafeIndoor.cards[0].suggestedAction =
      "Houseplants alone clean all PM2.5 so exhaust fans guarantee safe indoor air.";
    const safeIndoor = applyIndoorSafetyPolicy(unsafeIndoor, ctx, "hi");
    expect(safeIndoor.report.conservativeOverrideApplied).toBe(true);

    // Sustainability fabricated CO2e + unsafe cycling recommendation
    const unsafeSust = buildDeterministicSustainabilityFallback(ctx);
    unsafeSust.alternatives[0].suggestedAlternative =
      "Cycle to work to cut 500 kg of CO2e and cuts emissions by 80%!";
    const safeSust = applySustainabilitySafetyPolicy(unsafeSust, ctx, "en");
    expect(safeSust.report.conservativeOverrideApplied).toBe(true);

    // Community safety scan
    const commPlan = buildDeterministicCommunityFallback(ctx, "residential_society");
    commPlan.immediateActions[0] = "Air is 100% safe outdoors for sports.";
    const safeComm = applyCommunitySafetyPolicy(commPlan, ctx);
    expect(safeComm.report.passed).toBe(false);
    expect(safeComm.report.violations).toContain("guaranteed_safe_air_claim");
  });

  test("covers AQI classification breakpoints, freshness intervals, trend summaries, insights, and transient retries", async () => {
    expect(classifyUsAqi(null).valid).toBe(false);
    expect(classifyUsAqi(25).band?.labelEn).toBe("Good");
    expect(classifyUsAqi(75).band?.labelEn).toBe("Moderate");
    expect(classifyUsAqi(125).band?.labelEn).toBe("Unhealthy for Sensitive Groups");
    expect(classifyUsAqi(175).band?.labelEn).toBe("Unhealthy");
    expect(classifyUsAqi(250).band?.labelEn).toBe("Very Unhealthy");
    expect(classifyUsAqi(380).band?.labelEn).toBe("Hazardous");
    expect(classifyUsAqi(540).isBeyondScale).toBe(true);

    const nowMs = Date.now();
    expect(evaluateDataFreshness(new Date(nowMs - 5 * 60_000).toISOString(), nowMs).status).toBe("fresh");
    expect(evaluateDataFreshness(new Date(nowMs - 30 * 60_000).toISOString(), nowMs).status).toBe("stale");
    expect(evaluateDataFreshness("not-a-timestamp", nowMs).status).toBe("unavailable");

    expect(summarizeForecast([]).trend).toBe("insufficient_data");

    const forecast = getDemoForecast("new-delhi");
    const summary = summarizeForecast(forecast.hourly);
    const lowerWindow = findRelativelyLowerExposureWindows(forecast.hourly);
    const dominant = determineDominantPollutant(forecast.current.subindices);
    const guidanceEn = buildRuleBasedGuidance(forecast, DEFAULT_FAMILY_PROFILE, "en", lowerWindow);
    const guidanceHi = buildRuleBasedGuidance(forecast, DEFAULT_FAMILY_PROFILE, "hi", lowerWindow);
    expect(buildAirQualityInsights(forecast, summary, lowerWindow, guidanceEn, dominant, "en").length).toBeGreaterThan(0);
    expect(buildAirQualityInsights(forecast, summary, lowerWindow, guidanceHi, dominant, "hi").length).toBeGreaterThan(0);

    // Route-helper origin validation & Open-Meteo fallback when upstream fails
    const badOriginReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      headers: { origin: "not-a-url", host: "localhost:3000" },
    });
    expect(isAllowedOrigin(badOriginReq)).toBe(false);

    const noHostReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      headers: { origin: "https://example.com" },
    });
    expect(isAllowedOrigin(noHostReq)).toBe(true);

    // Open-Meteo transient error recovers on retry attempt 2
    let tries = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      tries += 1;
      if (tries === 1) throw new Error("ECONNRESET");
      return {
        ok: true,
        json: async () => ({
          latitude: 18.52,
          longitude: 73.85,
          timezone: "Asia/Kolkata",
          utc_offset_seconds: 19800,
          current: { time: "2026-11-27T12:00", us_aqi: 82, pm2_5: 25 },
          hourly: { time: ["2026-11-27T12:00"], us_aqi: [82], pm2_5: [25] },
        }),
      } as Response;
    });

    const svc = new OpenMeteoAirQualityService();
    const recovered = await svc.getForecast(
      { ...forecast.location, id: "pune-retry", latitude: 18.52, longitude: 73.85 },
      { forecastDays: 2 }
    );
    expect(tries).toBe(2);
    expect(recovered.current.usAqi).toBe(82);

    // resolveServerAiContext falls back gracefully to explicit demonstration context when Open-Meteo fails
    global.fetch = vi.fn().mockRejectedValue(new Error("Offline"));
    const resolved = await resolveServerAiContext({
      location: { ...forecast.location, id: "fallback-loc", latitude: 15.1, longitude: 74.1 },
      locale: "en",
    });
    expect(resolved.context.provenance.dataSourceType).toBe("demonstration");
  });
});
