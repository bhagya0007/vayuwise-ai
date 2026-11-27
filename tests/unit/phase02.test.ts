import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  evaluateDataFreshness,
  findRelativelyLowerExposureWindows,
  formatPollutantValue,
  summarizeForecast,
} from "@/lib/air-quality/intelligence";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import {
  checkRateLimit,
  clearMemoryCacheForTests,
  dedupeInflight,
  getCachedEntry,
  setCachedEntry,
} from "@/lib/cache/memory-cache";
import { airQualityQuerySchema, locationSearchQuerySchema } from "@/lib/schemas";
import {
  normalizeLocationQuery,
  normalizeOpenMeteoAirQuality,
  OpenMeteoAirQualityService,
  toOffsetIsoTimestamp,
  UpstreamApiError,
} from "@/services/air-quality/open-meteo";
import { DEFAULT_FAMILY_PROFILE } from "@/components/providers/AppProviders";
import type { AirQualityPoint, GeoLocation } from "@/types/domain";

const SAMPLE_CITY: GeoLocation = {
  id: "om-1261481",
  name: "New Delhi",
  region: "Delhi",
  country: "India",
  countryCode: "IN",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

beforeEach(() => {
  clearMemoryCacheForTests();
  vi.restoreAllMocks();
});

describe("Phase 02 AQI Intelligence & Resilience Suite", () => {
  test("classifies US AQI category boundaries, fractional values, >500, and invalid inputs", () => {
    expect(classifyUsAqi(0).band?.id).toBe("good");
    expect(classifyUsAqi(50).band?.id).toBe("good");
    expect(classifyUsAqi(51).band?.id).toBe("moderate");
    expect(classifyUsAqi(100.4).band?.id).toBe("moderate");
    expect(classifyUsAqi(101).band?.id).toBe("sensitive");
    expect(classifyUsAqi(150).band?.id).toBe("sensitive");
    expect(classifyUsAqi(151).band?.id).toBe("unhealthy");
    expect(classifyUsAqi(200).band?.id).toBe("unhealthy");
    expect(classifyUsAqi(201).band?.id).toBe("very_unhealthy");
    expect(classifyUsAqi(300).band?.id).toBe("very_unhealthy");
    expect(classifyUsAqi(301).band?.id).toBe("hazardous");

    const extreme = classifyUsAqi(560);
    expect(extreme.valid).toBe(true);
    expect(extreme.roundedValue).toBe(560);
    expect(extreme.isBeyondScale).toBe(true);
    expect(extreme.gaugePercent).toBe(100);

    expect(classifyUsAqi(null).valid).toBe(false);
    expect(classifyUsAqi(-5).valid).toBe(false);
    expect(classifyUsAqi(Number.NaN).valid).toBe(false);
  });

  test("determines dominant pollutant strictly via subindices and handles missing values", () => {
    // Raw CO might be 2500 µg/m³ while PM2.5 is 145 µg/m³ — subindex decides!
    const res = determineDominantPollutant({
      pm25: 195,
      pm10: 83,
      no2: 47,
      o3: 28,
      so2: 37,
      co: 19,
    });
    expect(res.reliable).toBe(true);
    expect(res.dominantPollutant).toBe("pm25");

    const insufficient = determineDominantPollutant({
      pm25: 120,
      pm10: null,
      no2: null,
      o3: null,
      so2: null,
      co: null,
    });
    expect(insufficient.reliable).toBe(false);
    expect(insufficient.dominantPollutant).toBeNull();

    expect(formatPollutantValue("pm25", null)).toBe("Unavailable");
    expect(formatPollutantValue("pm25", 0)).toBe("0.0 µg/m³");
  });

  test("validates coordinates and location search query constraints", () => {
    expect(
      airQualityQuerySchema.safeParse({ lat: 95, lon: 77 }).success
    ).toBe(false);
    expect(
      airQualityQuerySchema.safeParse({ lat: 28.6, lon: 185 }).success
    ).toBe(false);
    expect(
      airQualityQuerySchema.safeParse({ lat: 28.61, lon: 77.2 }).success
    ).toBe(true);

    expect(locationSearchQuerySchema.safeParse({ q: "a" }).success).toBe(false);
    expect(
      locationSearchQuerySchema.safeParse({ q: "New Delhi" }).success
    ).toBe(true);
    expect(normalizeLocationQuery("Delhi")).toBe("New Delhi");
    expect(normalizeLocationQuery("Bangalore")).toBe("Bengaluru");
  });

  test("normalizes Open-Meteo timestamps across midnight & preserves null pollutants", () => {
    expect(toOffsetIsoTimestamp("2026-11-26T22:30", 19800)).toBe(
      "2026-11-26T22:30:00+05:30"
    );

    const payload = {
      latitude: 28.6,
      longitude: 77.2,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      current_units: {
        pm2_5: "µg/m³",
        pm10: "µg/m³",
        nitrogen_dioxide: "µg/m³",
        ozone: "µg/m³",
        sulphur_dioxide: "µg/m³",
        carbon_monoxide: "µg/m³",
      },
      current: {
        time: "2026-11-26T22:30",
        us_aqi: 195,
        us_aqi_pm2_5: 195,
        us_aqi_pm10: 83,
        us_aqi_nitrogen_dioxide: 47,
        us_aqi_ozone: 28,
        us_aqi_sulphur_dioxide: 37,
        us_aqi_carbon_monoxide: 19,
        pm2_5: 145.3,
        pm10: null,
        nitrogen_dioxide: 96.1,
        ozone: 5,
        sulphur_dioxide: 68.2,
        carbon_monoxide: 2576,
      },
      hourly: {
        time: [
          "2026-11-26T22:00",
          "2026-11-26T23:00",
          "2026-11-27T00:00",
          "2026-11-27T01:00",
        ],
        us_aqi: [190, 200, 175, 160],
        pm2_5: [140, 150, 120, 105],
        pm10: [null, 155, 130, 118],
      },
    };

    const normalized = normalizeOpenMeteoAirQuality(payload, SAMPLE_CITY);
    expect(normalized.current.pollutants.pm10).toBeNull();
    expect(normalized.dominantPollutant).toBe("pm25");
    expect(normalized.hourly).toHaveLength(4);
    expect(normalized.hourly[2].timestampIso).toBe("2026-11-27T00:00:00+05:30");
    expect(normalized.provenance.dataSourceType).toBe("modeled");
  });

  test("identifies relatively lower-exposure windows and flags entirely unhealthy forecasts", () => {
    const points: AirQualityPoint[] = [
      { timestampIso: "2026-11-26T10:00:00Z", usAqi: 240, europeanAqi: null, pollutants: { pm25: 150, pm10: null, no2: null, so2: null, o3: null, co: null } },
      { timestampIso: "2026-11-26T11:00:00Z", usAqi: 210, europeanAqi: null, pollutants: { pm25: 130, pm10: null, no2: null, so2: null, o3: null, co: null } },
      { timestampIso: "2026-11-26T12:00:00Z", usAqi: 165, europeanAqi: null, pollutants: { pm25: 90, pm10: null, no2: null, so2: null, o3: null, co: null } },
      { timestampIso: "2026-11-26T13:00:00Z", usAqi: 175, europeanAqi: null, pollutants: { pm25: 95, pm10: null, no2: null, so2: null, o3: null, co: null } },
    ];

    const summary = summarizeForecast(points, 24);
    expect(summary.availableHours).toBe(4);
    expect(summary.unhealthyOrWorseHours).toBe(4);
    expect(summary.allUnhealthyOrWorse).toBe(true);
    expect(summary.lowestPoint?.usAqi).toBe(165);

    const win2h = findRelativelyLowerExposureWindows(points, 2, 24);
    expect(win2h.available).toBe(true);
    expect(win2h.bestWindow?.averageUsAqi).toBe(170);
    expect(win2h.postponeOutdoorExercise).toBe(true);
    expect(win2h.cautionEn).toMatch(/Postpone strenuous outdoor exercise/i);

    // Non-contiguous gap should not form a 2-hour window
    const gapped: AirQualityPoint[] = [
      points[0],
      { ...points[0], timestampIso: "2026-11-26T15:00:00Z", usAqi: 90 },
    ];
    expect(findRelativelyLowerExposureWindows(gapped, 2, 24).available).toBe(
      false
    );
  });

  test("evaluates freshness, caching, deduplication, and rate limiting", async () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    expect(
      evaluateDataFreshness("2026-11-26T11:52:00Z", now).status
    ).toBe("fresh");
    expect(
      evaluateDataFreshness("2026-11-26T11:30:00Z", now).isStale
    ).toBe(true);

    setCachedEntry("k1", { v: 42 }, 60_000, 120_000, now);
    expect(getCachedEntry<{ v: number }>("k1", now + 10_000).isStale).toBe(false);
    expect(getCachedEntry<{ v: number }>("k1", now + 90_000).isStale).toBe(true);

    let runs = 0;
    const [a, b] = await Promise.all([
      dedupeInflight("d1", async () => {
        runs += 1;
        return "ok";
      }),
      dedupeInflight("d1", async () => {
        runs += 1;
        return "ok";
      }),
    ]);
    expect(a).toBe("ok");
    expect(b).toBe("ok");
    expect(runs).toBe(1);

    expect(checkRateLimit("ip1", 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit("ip1", 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit("ip1", 2, 60_000, now).allowed).toBe(false);
  });

  test("handles upstream 429, timeouts, and stale fallback cleanly", async () => {
    const service = new OpenMeteoAirQualityService();

    // Timeout / AbortError
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      })
    );
    await expect(service.getForecast(SAMPLE_CITY)).rejects.toMatchObject({
      code: "TIMEOUT",
    });

    // HTTP 429
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Too Many Requests", { status: 429 }))
    );
    await expect(service.getForecast(SAMPLE_CITY)).rejects.toBeInstanceOf(
      UpstreamApiError
    );
  });

  test("prioritizes respiratory protection over outdoor eco-commuting in severe AQI & builds Gemini context", () => {
    const service = new OpenMeteoAirQualityService();
    const demoForecast = service.getDemonstrationFallback(SAMPLE_CITY);

    const guidance = buildRuleBasedGuidance(
      demoForecast,
      DEFAULT_FAMILY_PROFILE,
      "en"
    );
    expect(guidance.isAiGenerated).toBe(false);
    expect(guidance.healthProtectionPriority).toBe(true);
    const commuteItem = guidance.items.find((i) => i.category === "commuting");
    expect(commuteItem?.action).toMatch(/enclosed metro|remote work/i);

    const ctx = buildGeminiAirQualityContext(
      demoForecast,
      DEFAULT_FAMILY_PROFILE,
      "en"
    );
    expect(ctx.provenance.dataSourceType).toBe("demonstration");
    expect(ctx.deterministicGuidance.healthProtectionPriority).toBe(true);
  });
});
