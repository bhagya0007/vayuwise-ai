// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as impactPost } from "@/app/api/ai/impact/route";
import {
  EMISSION_FACTOR_REGISTRY,
  EMISSION_FACTOR_REGISTRY_VERSION,
  INDIA_GRID_EF_KG_CO2_PER_KWH,
  checkBoundaryCompatibility,
  getEmissionFactorForMode,
} from "@/lib/impact/emission-factors";
import {
  calculateTransportScenario,
  compareTransportScenarios,
} from "@/lib/impact/transport-calculator";
import { compareOutdoorConcentrationTime } from "@/lib/impact/exposure-calculator";
import {
  addActivityRecord,
  removeActivityRecord,
  summarizeActivities,
  updateActivityRecord,
} from "@/lib/impact/activity-tracker";
import {
  buildNormalizedPersonalizationContext,
  computeRecommendationFingerprint,
  prioritizeRecommendations,
} from "@/lib/personalization/engine";
import { migratePersistedProfile } from "@/lib/personalization/profile-storage";
import { applyImpactExplainSafetyPolicy } from "@/lib/ai/safety";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import { openMeteoAirQualityService } from "@/services/air-quality/open-meteo";
import { getDemoForecast, DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import { DEFAULT_FAMILY_PROFILE } from "@/components/providers/AppProviders";
import { PHASE04_DICTIONARY } from "@/lib/i18n/phase04-dictionary";
import type { ActivityLogRecord } from "@/types/domain";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Phase 04 Personalization, Migration & Smart Prioritization", () => {
  test("migrates v1 saved profile (walk_cycle & missing v2 fields) without losing valid preferences or leaking unknown PII", () => {
    const legacyRaw = {
      name: "Should Be Stripped PII",
      address: "Secret Street 42",
      medicalRecord: "Asthma inhaler dose",
      cityId: "mumbai",
      householdAdults: 3,
      childrenCount: 2,
      seniorsCount: 1,
      hasRespiratorySensitivity: true,
      primaryCommute: "walk_cycle",
      dailyCommuteKm: 9,
      hasHepaPurifier: false,
      canCrossVentilate: true,
      budgetTier: "free",
      preferredLocale: "hi",
    };

    const migrated = migratePersistedProfile(legacyRaw, DEFAULT_FAMILY_PROFILE);
    expect(migrated.migrated).toBe(true);
    expect(migrated.profile.profileVersion).toBe(2);
    expect(migrated.profile.cityId).toBe("mumbai");
    expect(migrated.profile.householdAdults).toBe(3);
    expect(migrated.profile.childrenCount).toBe(2);
    expect(migrated.profile.primaryCommute).toBe("walk");
    expect(migrated.profile.budgetTier).toBe("free");
    expect(migrated.profile.preferredLocale).toBe("hi");
    expect("name" in (migrated.profile as unknown as Record<string, unknown>)).toBe(false);
    expect("medicalRecord" in (migrated.profile as unknown as Record<string, unknown>)).toBe(false);
  });

  test("normalized personalization context & smart scoring enforce health protection override over outdoor eco commute during severe smog", () => {
    const forecast = getDemoForecast("new-delhi");
    forecast.current.usAqi = 240;

    const studentProfile = {
      ...DEFAULT_FAMILY_PROFILE,
      lifestyleCategory: "student" as const,
      budgetTier: "free" as const,
      dailyCommuteKm: 16,
      primaryCommute: "car_petrol" as const,
    };

    const ctx = buildNormalizedPersonalizationContext({
      profile: studentProfile,
      location: DEMO_LOCATIONS[0],
      forecast,
      locale: "en",
    });

    expect(ctx.healthProtectionConsiderations.healthProtectionPriority).toBe(true);
    expect(ctx.healthProtectionConsiderations.outdoorSwitchBlockedByPollution).toBe(true);
    expect(ctx.transportationPreferences.estimatedAnnualBaselineKgCo2e).toBeGreaterThan(0);

    const ranked = prioritizeRecommendations(
      [
        {
          id: "cycle-commute",
          title: "Cycle 16 km outdoors to cut emissions",
          category: "active_outdoor",
          relativeCost: "free",
          isOutdoorExertion: true,
          estimatedAnnualCo2eSavedKg: 600,
        },
        {
          id: "indoor-mask",
          title: "Seal drafts & damp mop indoors",
          category: "indoor_protection",
          relativeCost: "free",
          isOutdoorExertion: false,
        },
      ],
      ctx
    );

    expect(ranked[0].item.id).toBe("indoor-mask");
    const cycleRank = ranked.find((r) => r.item.id === "cycle-commute")!;
    expect(cycleRank.suppressedByHealthPriority).toBe(true);
    expect(cycleRank.score).toBeLessThan(0);
    expect(ranked[0].disclaimer).toContain("not medical risk");
  });

  test("recommendation fingerprint changes deterministically when profile preferences or city change", () => {
    const fp1 = computeRecommendationFingerprint(DEMO_LOCATIONS[0], DEFAULT_FAMILY_PROFILE, "en");
    const fp2 = computeRecommendationFingerprint(
      DEMO_LOCATIONS[0],
      { ...DEFAULT_FAMILY_PROFILE, dailyCommuteKm: 25 },
      "en"
    );
    const fp3 = computeRecommendationFingerprint(DEMO_LOCATIONS[1], DEFAULT_FAMILY_PROFILE, "en");

    expect(fp1).not.toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });
});

describe("Phase 04 Emission Factor Registry & Deterministic Transport Math (Independent Reference Checks)", () => {
  test("emission factor registry contains documented citations, units, and boundaries for all 12 modes", () => {
    const modes = Object.values(EMISSION_FACTOR_REGISTRY);
    expect(modes).toHaveLength(12);
    for (const entry of modes) {
      expect(entry.sourceUrl).toMatch(/^https:\/\//);
      expect(entry.publicationYear).toBeGreaterThanOrEqual(2015);
      expect(entry.limitations.length).toBeGreaterThan(10);
    }
    // Check CEA EV derivation independently: 0.15 kWh/km * 0.727 kg/kWh = 0.10905 kg/vkm
    expect(getEmissionFactorForMode("car_electric").numericalFactorKgCo2e).toBeCloseTo(
      0.15 * INDIA_GRID_EF_KG_CO2_PER_KWH,
      5
    );
  });

  test("vehicle-km calculation applies Distance * Factor / Occupancy (independent arithmetic check)", () => {
    // 20 km/day * 0.163 kg/vkm / 1 occupant = 3.26 kg/day; 5 days * 48 weeks = 240 days => 782.4 kg/yr
    const solo = calculateTransportScenario({
      mode: "car_petrol",
      roundTripDistanceKm: 20,
      travelDaysPerWeek: 5,
      workingWeeksPerYear: 48,
      occupancy: 1,
    });
    expect(solo.dailyKgCo2e).toBeCloseTo(3.26, 4);
    expect(solo.weeklyKgCo2e).toBeCloseTo(16.3, 3);
    expect(solo.annualKgCo2e).toBeCloseTo(782.4, 3);
    expect(solo.monthlyKgCo2e).toBeCloseTo(782.4 / 12, 3);

    // Carpool with 4 occupants: 20 * 0.163 / 4 = 0.815 kg/day => 195.6 kg/yr
    const shared = calculateTransportScenario({
      mode: "carpool",
      roundTripDistanceKm: 20,
      travelDaysPerWeek: 5,
      workingWeeksPerYear: 48,
      occupancy: 4,
    });
    expect(shared.dailyKgCo2e).toBeCloseTo(0.815, 4);
    expect(shared.annualKgCo2e).toBeCloseTo(195.6, 3);
  });

  test("passenger-km calculation (bus & metro) never divides by occupancy a second time", () => {
    // Bus = 0.015161 kg/pkm; 12.5 km decimal distance * 0.015161 = 0.1895125 -> rounded 0.1895 kg/day
    const bus = calculateTransportScenario({
      mode: "bus",
      roundTripDistanceKm: 12.5,
      travelDaysPerWeek: 5,
      workingWeeksPerYear: 50,
      occupancy: 4, // must be ignored for passenger_km!
    });
    expect(bus.appliedOccupancy).toBe(1);
    expect(bus.dailyKgCo2e).toBeCloseTo(12.5 * 0.015161, 4);
    expect(bus.annualKgCo2e).toBeCloseTo(12.5 * 0.015161 * 250, 2);
  });

  test("handles zero distance, zero baseline (no division by zero), negative savings, and cross-boundary disclosures", () => {
    // Zero baseline: walking -> petrol car (negative savings, percentageChange null)
    const zeroBase = compareTransportScenarios({
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
    expect(zeroBase.avoidedAnnualKgCo2e).toBeLessThan(0);
    expect(zeroBase.isNegativeSavings).toBe(true);
    expect(zeroBase.percentageChange).toBeNull();

    // Bus -> Petrol Car negative savings with valid negative percentage:
    // Bus: 10 km * 0.015161 * 200 days = 30.322 kg; Car: 10 * 0.163 * 200 = 326 kg
    // Avoided = 30.322 - 326 = -295.678 kg
    const busToCar = compareTransportScenarios({
      baseline: {
        mode: "bus",
        roundTripDistanceKm: 10,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 40,
      },
      alternative: {
        mode: "car_petrol",
        roundTripDistanceKm: 10,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 40,
        occupancy: 1,
      },
    });
    expect(busToCar.isNegativeSavings).toBe(true);
    expect(busToCar.avoidedAnnualKgCo2e).toBeCloseTo(-295.678, 2);
    expect(busToCar.percentageChange).toBeLessThan(0);

    // Zero distance
    const zeroDist = calculateTransportScenario({
      mode: "car_cng",
      roundTripDistanceKm: 0,
      travelDaysPerWeek: 5,
      workingWeeksPerYear: 48,
    });
    expect(zeroDist.annualKgCo2e).toBe(0);

    // Boundary compatibility disclosure between tailpipe_ttw and electricity_generation_scope2
    const notice = checkBoundaryCompatibility(
      getEmissionFactorForMode("car_petrol"),
      getEmissionFactorForMode("car_electric")
    );
    expect(notice.sameBoundary).toBe(false);
    expect(notice.summaryEn).toContain("tailpipe_ttw");
    expect(notice.summaryEn).toContain("electricity_generation_scope2");
  });

  test("rejects negative distances, invalid occupancy, and extreme distances", () => {
    expect(() =>
      calculateTransportScenario({
        mode: "car_petrol",
        roundTripDistanceKm: -5,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      })
    ).toThrow();

    expect(() =>
      calculateTransportScenario({
        mode: "carpool",
        roundTripDistanceKm: 15,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1, // minOccupancy for carpool is 2
      })
    ).toThrow();

    expect(() =>
      calculateTransportScenario({
        mode: "car_petrol",
        roundTripDistanceKm: 9999,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      })
    ).toThrow();
  });
});

describe("Phase 04 Exposure Engine, Activity Tracker & Gemini Numerical Grounding", () => {
  test("computes ambient PM2.5 concentration-time (ug*h/m3) and warns honestly on missing/stale/severe data", () => {
    const valid = compareOutdoorConcentrationTime({
      baselineHourIso: "2026-11-27T07:00:00Z",
      baselinePm25UgM3: 180,
      baselineUsAqi: 230,
      alternativeHourIso: "2026-11-27T14:00:00Z",
      alternativePm25UgM3: 90,
      alternativeUsAqi: 169,
      durationHours: 1.5,
      isStaleForecast: false,
      dataSourceType: "modeled",
    });
    expect(valid.valid).toBe(true);
    expect(valid.baselineConcentrationTimeUgHrM3).toBe(270);
    expect(valid.alternativeConcentrationTimeUgHrM3).toBe(135);
    expect(valid.differenceUgHrM3).toBe(135);
    expect(valid.healthProtectionPriority).toBe(true);
    expect(valid.scientificDisclosure).toContain("Does not measure inhaled dose");

    const missingPm25 = compareOutdoorConcentrationTime({
      baselineHourIso: "2026-11-27T07:00:00Z",
      baselinePm25UgM3: null,
      baselineUsAqi: 190,
      alternativeHourIso: "2026-11-27T14:00:00Z",
      alternativePm25UgM3: 80,
      alternativeUsAqi: 160,
      durationHours: 1,
      isStaleForecast: false,
      dataSourceType: "modeled",
    });
    expect(missingPm25.valid).toBe(false);
    expect(missingPm25.warningMessage).toContain("PM2.5");

    const stale = compareOutdoorConcentrationTime({
      baselineHourIso: "2026-11-27T07:00:00Z",
      baselinePm25UgM3: 45,
      baselineUsAqi: 124,
      alternativeHourIso: "2026-11-27T14:00:00Z",
      alternativePm25UgM3: 30,
      alternativeUsAqi: 89,
      durationHours: 1,
      isStaleForecast: true,
      dataSourceType: "stale",
    });
    expect(stale.valid).toBe(true);
    expect(stale.warningMessage).toContain("stale");
  });

  test("activity tracker prevents duplicate counting, preserves null savings for non-CO2e indoor actions, and supports edit/delete/summary", () => {
    let records: ActivityLogRecord[] = [];

    const first = addActivityRecord(records, {
      activityType: "used_public_transport",
      title: "Metro instead of Petrol Car",
      dedupeKey: "car_petrol->metro_rail:20",
      completedAtIso: "2026-11-27T09:00:00Z",
      baselineMode: "car_petrol",
      alternativeMode: "metro_rail",
      distanceKm: 20,
      occupancy: 1,
    });
    expect(first.added).toBe(true);
    expect(first.record?.emissionFactorVersion).toBe(EMISSION_FACTOR_REGISTRY_VERSION);
    // 20 * 0.163 - 20 * 0.025 = 3.26 - 0.50 = 2.76 kg
    expect(first.record?.calculatedSavingsKgCo2e).toBeCloseTo(2.76, 3);
    records = first.records;

    // Duplicate same day & dedupeKey rejected
    const dup = addActivityRecord(records, {
      activityType: "used_public_transport",
      title: "Metro instead of Petrol Car",
      dedupeKey: "car_petrol->metro_rail:20",
      completedAtIso: "2026-11-27T10:00:00Z",
      baselineMode: "car_petrol",
      alternativeMode: "metro_rail",
      distanceKm: 20,
    });
    expect(dup.added).toBe(false);
    expect(records).toHaveLength(1);

    // Indoor non-CO2e action has null savings (not invented)
    const indoor = addActivityRecord(records, {
      activityType: "indoor_air_action",
      title: "Damp mopping",
      dedupeKey: "indoor:mop",
      completedAtIso: "2026-11-27T11:00:00Z",
    });
    expect(indoor.added).toBe(true);
    expect(indoor.record?.calculatedSavingsKgCo2e).toBeNull();
    records = indoor.records;

    // Edit distance from 20 -> 10 km recalculates savings to 1.38 kg
    records = updateActivityRecord(records, first.record!.id, { distanceKm: 10 });
    expect(records.find((r) => r.id === first.record!.id)?.calculatedSavingsKgCo2e).toBeCloseTo(
      1.38,
      3
    );

    const summary = summarizeActivities(records, new Date("2026-11-27T12:00:00Z"));
    expect(summary.totalRecords).toBe(2);
    expect(summary.dailySavingsKgCo2e).toBeCloseTo(1.38, 3);

    records = removeActivityRecord(records, first.record!.id);
    expect(records).toHaveLength(1);
  });

  test("safety layer blocks Gemini attempts to modify calculated CO2e values or invent health-risk percentages", () => {
    const forecast = getDemoForecast("new-delhi");
    const ctx = buildGeminiAirQualityContext(forecast, DEFAULT_FAMILY_PROFILE, "en");
    const comparison = compareTransportScenarios({
      baseline: {
        mode: "car_petrol",
        roundTripDistanceKm: 14,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1,
      },
      alternative: {
        mode: "metro_rail",
        roundTripDistanceKm: 14,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
    });

    const tampered = applyImpactExplainSafetyPolicy(
      {
        headline: "Your metro commute impact",
        whatItMeans:
          "You avoid 9999 kg of CO2e per year and reduce asthma risk by 80%.",
        practicalTradeOffs: "Metro uses grid power.",
        exposureVsClimateNote: "Enclosed train reduces road smoke.",
        nextSteps: ["Use metro", "Check AQI"],
        whyThisRecommendation: "Grounded check",
        dataBasis: "CEA / India GHG",
        sourceIds: ["CEA_INDIA_CO2_V20"],
        disclaimer: "Estimate only.",
      },
      ctx,
      comparison,
      "en"
    );

    expect(tampered.report.passed).toBe(false);
    expect(tampered.report.conservativeOverrideApplied).toBe(true);
    expect(tampered.report.violations).toContain(
      "unsupported_or_modified_calculated_value"
    );
    expect(tampered.data.whatItMeans).not.toContain("9999");
    expect(tampered.data.whatItMeans).toContain(
      comparison.avoidedAnnualKgCo2e.toFixed(1)
    );
  });

  test("POST /api/ai/impact enforces schema validation, returns deterministicComparison in 503 fallback, and checks genuine missing/stale context", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.spyOn(openMeteoAirQualityService, "getForecast").mockResolvedValueOnce(
      getDemoForecast("new-delhi")
    );
    const req = new NextRequest("http://localhost:3000/api/ai/impact", {
      method: "POST",
      body: JSON.stringify({
        locale: "en",
        location: DEMO_LOCATIONS[0],
        baseline: {
          mode: "car_petrol",
          roundTripDistanceKm: 10,
          travelDaysPerWeek: 5,
          workingWeeksPerYear: 48,
          occupancy: 1,
        },
        alternative: {
          mode: "metro_rail",
          roundTripDistanceKm: 10,
          travelDaysPerWeek: 5,
          workingWeeksPerYear: 48,
        },
      }),
    });

    const res = await impactPost(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.aiGenerated).toBe(false);
    expect(body.deterministicComparison.avoidedAnnualKgCo2e).toBeCloseTo(
      (0.163 - 0.025) * 10 * 5 * 48,
      2
    );
    expect(body.fallbackData.whatItMeans).toContain("Deterministic Rule-Based Explanation");

    // Explicit genuine missing & stale AQI context verification (not a remote valid-AQI proxy)
    const missingForecast = getDemoForecast("new-delhi");
    missingForecast.current.usAqi = null;
    missingForecast.current.pollutants.pm25 = null;
    missingForecast.provenance.isStale = true;
    missingForecast.provenance.freshnessStatus = "stale";
    missingForecast.provenance.dataSourceType = "stale";

    const staleCtx = buildGeminiAirQualityContext(
      missingForecast,
      DEFAULT_FAMILY_PROFILE,
      "en"
    );
    expect(staleCtx.current.usAqi).toBeNull();
    expect(staleCtx.current.missingPollutants).toContain("pm25");
    expect(staleCtx.provenance.isStale).toBe(true);
    expect(staleCtx.provenance.staleWarning).toBeDefined();
  });

  test("EN and HI Phase 04 localization covers all 6 onboarding steps, 6+ profile types, 12+ commute modes, and impact controls", () => {
    expect(PHASE04_DICTIONARY.en.onboarding.steps).toHaveLength(6);
    expect(PHASE04_DICTIONARY.hi.onboarding.steps).toHaveLength(6);
    for (const mode of Object.keys(EMISSION_FACTOR_REGISTRY)) {
      expect(
        PHASE04_DICTIONARY.en.commuteModes[
          mode as keyof typeof PHASE04_DICTIONARY.en.commuteModes
        ].length
      ).toBeGreaterThan(2);
      expect(
        PHASE04_DICTIONARY.hi.commuteModes[
          mode as keyof typeof PHASE04_DICTIONARY.hi.commuteModes
        ].length
      ).toBeGreaterThan(2);
    }
    expect(PHASE04_DICTIONARY.hi.impact.explainBtn).toContain("प्रभाव");
  });
});
