// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { postAiEndpoint, toAiLocationPayload } from "@/lib/ai/client";
import {
  buildDeterministicDailyPlanFallback,
  buildDeterministicImpactFallback,
  buildDeterministicIndoorFallback,
} from "@/lib/ai/fallbacks";
import {
  applyChatSafetyPolicy,
  applyDailyPlanSafetyPolicy,
  applyImpactExplainSafetyPolicy,
  applyIndoorSafetyPolicy,
  getEmergencyDisclaimer,
  hasEmergencySymptoms,
  sanitizeModelText,
  scanTextForSafetyViolations,
} from "@/lib/ai/safety";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { APP_DICTIONARY, formatHouseholdLabel, SHELL_DICTIONARY } from "@/lib/i18n/dictionary";
import { PHASE04_DICTIONARY } from "@/lib/i18n/phase04-dictionary";
import {
  addActivityRecord,
  computeDeterministicTripSavings,
  getLocalDateKey,
  parseStoredActivities,
  removeActivityRecord,
  summarizeActivities,
  updateActivityRecord,
} from "@/lib/impact/activity-tracker";
import { evaluateSustainabilityTransportSwap } from "@/lib/impact/sustainability-swap";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import {
  CURRENT_PROFILE_VERSION,
  DEFAULT_FAMILY_PROFILE,
  migratePersistedProfile,
  normalizeLegacyCommuteMode,
} from "@/lib/personalization/profile-storage";
import type { ActivityLogRecord } from "@/types/domain";

const ORIGINAL_FETCH = global.fetch;

describe("Phase 11.3 — Edge Cases: Safety, Localization, Storage Migration & Client Helpers", () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  test("safety policies detect EN/HI emergency symptoms, sanitize markup, and guard indoor/impact responses", () => {
    expect(hasEmergencySymptoms("Child has wheezing and difficulty breathing")).toBe(true);
    expect(hasEmergencySymptoms("सांस फूल रही है और सीने में दर्द")).toBe(true);
    expect(hasEmergencySymptoms("Planning my morning commute")).toBe(false);
    expect(getEmergencyDisclaimer("hi")).toContain("आपातकालीन");
    expect(getEmergencyDisclaimer("en")).toContain("emergency care");

    expect(sanitizeModelText("<b>Hello</b> `code`")).toBe("Hello `code`");
    expect(
      scanTextForSafetyViolations(
        "Use ozone generator and sleep with houseplants to clean PM2.5",
        { healthProtectionPriority: true }
      )
    ).toEqual(expect.arrayContaining(["unsafe_indoor_air_claim"]));

    const forecast = getDemoForecast("new-delhi");
    forecast.current.usAqi = 210;
    const ctx = buildGeminiAirQualityContext(forecast, DEFAULT_FAMILY_PROFILE, "en");

    // Emergency chat appends clinical care warning
    const chatEmergency = applyChatSafetyPolicy(
      {
        reply: "Wear a mask and check air quality.",
        recommendations: [],
        cautions: [],
        sourceIds: ["WHO_AQG_2021"],
        dataBasis: "Open-Meteo",
        whyThisRecommendation: "High PM2.5.",
        disclaimer: "Info only.",
      },
      ctx,
      "I am having chest pain and shortness of breath",
      "en"
    );
    expect(chatEmergency.report.emergencyCareAdvisoryAdded).toBe(true);
    expect(chatEmergency.data.cautions.length).toBeGreaterThan(0);

    // Unsafe indoor response replaces ozone/plant claim
    const indoorFallback = buildDeterministicIndoorFallback(ctx);
    indoorFallback.cards[0].suggestedAction =
      "Run an ozone generator overnight to destroy indoor PM2.5.";
    const safeIndoor = applyIndoorSafetyPolicy(indoorFallback, ctx, "en");
    expect(safeIndoor.report.violations).toContain("unsafe_indoor_air_claim");
    expect(safeIndoor.report.conservativeOverrideApplied).toBe(true);

    // High AQI daily plan containing vigorous outdoor play gets conservative override
    const plan = buildDeterministicDailyPlanFallback(ctx, "en");
    plan.slots[0].whatToDo = "Great morning for outdoor running and outdoor play!";
    const safePlan = applyDailyPlanSafetyPolicy(plan, ctx, "en");
    expect(safePlan.report.conservativeOverrideApplied).toBe(true);

    // Impact policy replaces fabricated numeric CO2e savings
    const comparison = compareTransportScenarios({
      baseline: {
        mode: "car_petrol",
        roundTripDistanceKm: 15,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
      alternative: {
        mode: "metro_rail",
        roundTripDistanceKm: 15,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
    });
    const fakeImpact = buildDeterministicImpactFallback(ctx, comparison, "en");
    fakeImpact.whatItMeans = "You save 99999 kg CO2e instantly!";
    const guardedImpact = applyImpactExplainSafetyPolicy(fakeImpact, ctx, comparison, "en");
    expect(guardedImpact.report.conservativeOverrideApplied).toBe(true);
    expect(guardedImpact.report.passed).toBe(false);
    expect(guardedImpact.data.whatItMeans).not.toContain("99999");
  });

  test("activity tracker handles corrupt storage, duplicate blocking, edits, removal, and time-window sums", () => {
    expect(parseStoredActivities(null)).toEqual([]);
    expect(parseStoredActivities("{bad json")).toEqual([]);
    expect(parseStoredActivities(JSON.stringify({ notArray: true }))).toEqual([]);

    const mixed = parseStoredActivities(
      JSON.stringify([
        { invalid: "record" },
        {
          id: "a1",
          dedupeKey: "2026-11-27:swap:metro",
          activityType: "used_public_transport",
          title: "Metro commute",
          completedAtIso: "2026-11-27T08:00:00.000Z",
          dateKey: "2026-11-27",
          baselineMode: "car_petrol",
          alternativeMode: "walk_cycle",
          distanceKm: 10,
          occupancy: 1,
          calculatedSavingsKgCo2e: 1.4,
          emissionFactorVersion: "v1",
        },
      ])
    );
    expect(mixed).toHaveLength(1);
    expect(mixed[0]?.alternativeMode).toBe("walk");

    expect(computeDeterministicTripSavings({ distanceKm: 10 })).toEqual({
      savingsKgCo2e: null,
      factorVersion: null,
    });
    expect(
      computeDeterministicTripSavings({
        baselineMode: "car_petrol",
        alternativeMode: "bus",
        distanceKm: -5,
      }).savingsKgCo2e
    ).toBeNull();

    const first = addActivityRecord([], {
      activityType: "used_public_transport",
      title: "Took metro",
      dedupeKey: "commute-metro",
      completedAtIso: "2026-11-27T09:00:00.000Z",
      baselineMode: "car_petrol",
      alternativeMode: "metro_rail",
      distanceKm: 14,
      occupancy: 1,
    });
    expect(first.added).toBe(true);
    expect((first.record?.calculatedSavingsKgCo2e ?? 0) > 0).toBe(true);

    // Same-day duplicate blocked
    const dup = addActivityRecord(first.records, {
      activityType: "used_public_transport",
      title: "Took metro",
      dedupeKey: "commute-metro",
      completedAtIso: "2026-11-27T18:00:00.000Z",
      baselineMode: "car_petrol",
      alternativeMode: "metro_rail",
      distanceKm: 14,
    });
    expect(dup.added).toBe(false);

    // Edit distance recomputes savings deterministically
    const recId = first.record!.id;
    const edited = updateActivityRecord(first.records, recId, { distanceKm: 28 });
    expect(edited[0]!.calculatedSavingsKgCo2e!).toBeCloseTo(
      first.record!.calculatedSavingsKgCo2e! * 2,
      2
    );

    const oldRec: ActivityLogRecord = {
      ...edited[0]!,
      id: "old-rec",
      dedupeKey: "2026-11-05:commute-metro",
      dateKey: "2026-11-05",
      completedAtIso: "2026-11-05T09:00:00.000Z",
    };

    const summary = summarizeActivities(
      [...edited, oldRec],
      new Date("2026-11-27T12:00:00.000Z")
    );
    expect(summary.totalRecords).toBe(2);
    expect(summary.dailySavingsKgCo2e).toBeCloseTo(edited[0]!.calculatedSavingsKgCo2e!, 2);
    expect(summary.monthlySavingsKgCo2e).toBeGreaterThan(summary.dailySavingsKgCo2e);

    const noRef = summarizeActivities(edited, null);
    expect(noRef.dailySavingsKgCo2e).toBe(0);

    expect(removeActivityRecord(edited, recId)).toEqual([]);
    expect(getLocalDateKey("not-a-date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("profile migration strips PII fields, normalizes v1 commute modes, and recovers from invalid inputs", () => {
    expect(normalizeLegacyCommuteMode("walk_cycle")).toBe("walk");
    expect(normalizeLegacyCommuteMode(undefined)).toBe("walk");

    expect(migratePersistedProfile(null, DEFAULT_FAMILY_PROFILE).migrated).toBe(false);

    const legacy = migratePersistedProfile(
      {
        profileVersion: 1,
        fullName: "Should Be Stripped",
        medicalHistory: "Should Be Stripped",
        primaryCommute: "walk_cycle",
        householdAdults: 3,
        childrenCount: 1,
        seniorsCount: 1,
        hasRespiratorySensitivity: true,
        budgetTier: "low_cost",
        preferredLocale: "hi",
      },
      DEFAULT_FAMILY_PROFILE
    );
    expect(legacy.migrated).toBe(true);
    expect(legacy.version).toBe(CURRENT_PROFILE_VERSION);
    expect(legacy.profile.primaryCommute).toBe("walk");
    expect(legacy.profile.preferredLocale).toBe("hi");
    expect("fullName" in legacy.profile).toBe(false);
    expect("medicalHistory" in legacy.profile).toBe(false);

    const invalid = migratePersistedProfile(
      { householdAdults: 999 },
      DEFAULT_FAMILY_PROFILE
    );
    expect(invalid.profile).toEqual({
      ...DEFAULT_FAMILY_PROFILE,
      profileVersion: CURRENT_PROFILE_VERSION,
    });
  });

  test("sustainability-swap handles all edge rejections and bilingual i18n dictionaries match keys", () => {
    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Solo petrol car commute",
        suggestedAlternative: "Install indoor air purifier",
        profilePrimaryCommute: "car_petrol",
        dailyCommuteKm: 15,
      }).reasonIfUnquantified
    ).toBe("non_transport_activity");

    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Solo petrol car",
        suggestedAlternative: "Switch to city bus",
        profilePrimaryCommute: "car_petrol",
        dailyCommuteKm: 0,
      }).reasonIfUnquantified
    ).toBe("missing_distance");

    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Metro rail",
        suggestedAlternative: "Take metro rail",
        profilePrimaryCommute: "metro_rail",
        dailyCommuteKm: 12,
      }).reasonIfUnquantified
    ).toBe("same_mode");

    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Cycle commute",
        suggestedAlternative: "Switch to petrol car",
        profilePrimaryCommute: "cycle",
        dailyCommuteKm: 12,
      }).reasonIfUnquantified
    ).toBe("missing_or_zero_baseline");

    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Metro rail commute",
        suggestedAlternative: "Switch to petrol car",
        profilePrimaryCommute: "metro_rail",
        dailyCommuteKm: 12,
      }).reasonIfUnquantified
    ).toBe("no_emissions_reduction");

    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Diesel car commute",
        suggestedAlternative: "Use electric carpool ride-share",
        profilePrimaryCommute: "car_diesel",
        dailyCommuteKm: 20,
      }).quantified
    ).toBe(true);
    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "CNG car daily drive",
        suggestedAlternative: "Walk to work twice a week",
        profilePrimaryCommute: "car_cng",
        dailyCommuteKm: 8,
      }).quantified
    ).toBe(true);
    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Petrol scooter commute",
        suggestedAlternative: "Switch to electric scooter or bicycle commute",
        profilePrimaryCommute: "two_wheeler",
        dailyCommuteKm: 12,
      }).quantified
    ).toBe(true);
    expect(
      evaluateSustainabilityTransportSwap({
        domain: "daily_commute",
        currentActivity: "Solo petrol car commute",
        suggestedAlternative: "Choose remote work from home",
        profilePrimaryCommute: "car_petrol",
        dailyCommuteKm: 16,
      }).quantified
    ).toBe(true);

    expect(formatHouseholdLabel(1, 0, 0, "en")).toBe("1 adult");
    expect(formatHouseholdLabel(2, 1, 1, "en")).toBe("2 adults, 1 child, 1 senior");
    expect(formatHouseholdLabel(2, 1, 1, "hi")).toBe("2 वयस्क, 1 बच्चा, 1 वरिष्ठजन");

    expect(Object.keys(APP_DICTIONARY.hi)).toEqual(Object.keys(APP_DICTIONARY.en));
    expect(Object.keys(SHELL_DICTIONARY.hi)).toEqual(Object.keys(SHELL_DICTIONARY.en));
    expect(Object.keys(PHASE04_DICTIONARY.hi)).toEqual(Object.keys(PHASE04_DICTIONARY.en));
  });

  test("postAiEndpoint and toAiLocationPayload handle success, HTTP failure, and network error", async () => {
    const loc = getDemoForecast("bengaluru").location;
    const payload = toAiLocationPayload(loc);
    expect(payload).toEqual({
      id: loc.id,
      name: loc.name,
      region: loc.region,
      country: loc.country,
      countryCode: loc.countryCode,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
    });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        data: { hello: "world" },
        aiGenerated: true,
        citations: [],
        contextMeta: null,
      }),
    } as Response);
    const okRes = await postAiEndpoint<{ hello: string }>({
      endpoint: "/api/ai/chat",
      body: {},
      fallbackErrorMessage: "err",
      networkErrorMessage: "net",
    });
    expect(okRes.ok).toBe(true);
    expect(okRes.payload?.data.hello).toBe("world");

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        ok: false,
        errorCode: "QUOTA_EXCEEDED",
        message: "Rate limited",
        fallbackData: { hello: "fallback" },
      }),
    } as Response);
    const errRes = await postAiEndpoint<{ hello: string }>({
      endpoint: "/api/ai/chat",
      body: {},
      fallbackErrorMessage: "err",
      networkErrorMessage: "net",
    });
    expect(errRes.ok).toBe(false);
    expect(errRes.error?.fallback?.hello).toBe("fallback");

    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Offline"));
    const netRes = await postAiEndpoint<{ hello: string }>({
      endpoint: "/api/ai/chat",
      body: {},
      fallbackErrorMessage: "err",
      networkErrorMessage: "Network down",
    });
    expect(netRes.ok).toBe(false);
    expect(netRes.error?.errorCode).toBe("NETWORK_ERROR");
  });
});
