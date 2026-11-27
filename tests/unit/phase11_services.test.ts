// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: generateContentMock,
    };
  },
}));

import {
  getPublicEnv,
  getServerEnv,
  isGeminiConfigured,
  resolveAppBaseUrl,
} from "@/config/env";
import {
  buildDeterministicChatFallback,
  buildDeterministicCommunityFallback,
  buildDeterministicDailyPlanFallback,
  buildDeterministicImpactFallback,
  buildDeterministicIndoorFallback,
  buildDeterministicSustainabilityFallback,
} from "@/lib/ai/fallbacks";
import {
  aiChatResponseSchema,
  aiCommunityPlanResponseSchema,
  aiDailyPlanResponseSchema,
  aiImpactExplainResponseSchema,
  aiIndoorAirResponseSchema,
  aiSustainabilityResponseSchema,
} from "@/lib/ai/schemas";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import { clearMemoryCacheForTests } from "@/lib/cache/memory-cache";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { DEFAULT_FAMILY_PROFILE } from "@/lib/personalization/profile-storage";
import {
  normalizeLocationQuery,
  normalizeOpenMeteoAirQuality,
  OpenMeteoAirQualityService,
  OpenMeteoGeocodingService,
  toOffsetIsoTimestamp,
  UpstreamApiError,
} from "@/services/air-quality/open-meteo";
import {
  generateStructuredWithGemini,
  runGeminiChat,
  runGeminiCommunityPlan,
  runGeminiDailyPlan,
  runGeminiImpactExplanation,
  runGeminiIndoorCoach,
  runGeminiSustainability,
} from "@/services/gemini/gemini-service";
import { z } from "zod";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

describe("Phase 11.3 — Environment Configuration, Gemini Service & Fallbacks", () => {
  beforeEach(() => {
    clearMemoryCacheForTests();
    generateContentMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  test("env helpers enforce configuration flags, placeholder detection, and base URL priority", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_AI_ENABLED;
    expect(isGeminiConfigured()).toBe(false);

    process.env.GEMINI_API_KEY = "your_gemini_api_key_here";
    expect(isGeminiConfigured()).toBe(false);

    process.env.GEMINI_API_KEY = "test_key_valid_format_12345";
    process.env.GEMINI_AI_ENABLED = "false";
    expect(getServerEnv().GEMINI_AI_ENABLED).toBe(false);
    expect(isGeminiConfigured()).toBe(false);

    process.env.GEMINI_AI_ENABLED = "true";
    expect(isGeminiConfigured()).toBe(true);

    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "vayuwise.example.app";
    expect(resolveAppBaseUrl()).toBe("https://vayuwise.example.app");

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "preview.vercel.app";
    expect(resolveAppBaseUrl()).toBe("https://preview.vercel.app");

    delete process.env.VERCEL_URL;
    expect(resolveAppBaseUrl()).toBe("http://localhost:3000");
    expect(getPublicEnv().NEXT_PUBLIC_APP_NAME).toBe("VayuWise AI");
  });

  test("generateStructuredWithGemini handles disabled flag, missing key, JSON retry, and schema validation errors", async () => {
    const simpleSchema = z.object({ answer: z.string().min(2) });

    process.env.GEMINI_AI_ENABLED = "false";
    const disabled = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "hi",
    });
    expect(disabled.ok).toBe(false);
    expect(disabled.errorCode).toBe("AI_DISABLED");

    process.env.GEMINI_AI_ENABLED = "true";
    delete process.env.GEMINI_API_KEY;
    const unconfigured = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "hi",
    });
    expect(unconfigured.ok).toBe(false);
    expect(unconfigured.errorCode).toBe("UNCONFIGURED");

    process.env.GEMINI_API_KEY = "AIzaSyFakeTestSecretKeyValue123456";
    let calls = 0;
    const recovered = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "hello",
      clientFactory: () =>
        ({
          models: {
            generateContent: async () => {
              calls += 1;
              if (calls === 1) {
                return { text: "{invalid-json" };
              }
              return {
                text: JSON.stringify({ answer: "Recovered structured response" }),
                usageMetadata: {
                  promptTokenCount: 10,
                  candidatesTokenCount: 12,
                  totalTokenCount: 22,
                },
              };
            },
          },
        }) as never,
    });
    expect(recovered.ok).toBe(true);
    expect(recovered.data?.answer).toBe("Recovered structured response");
    expect(recovered.usage?.totalTokens).toBe(22);

    const persistentSchemaFail = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "hello",
      clientFactory: () =>
        ({
          models: {
            generateContent: async () => ({ text: JSON.stringify({ wrong: 1 }) }),
          },
        }) as never,
    });
    expect(persistentSchemaFail.ok).toBe(false);
    expect(persistentSchemaFail.errorCode).toBe("VALIDATION_ERROR");
  });

  test("generateStructuredWithGemini redacts leaked credentials, classifies errors, switches fallback models, and handles aborts", async () => {
    const simpleSchema = z.object({ ok: z.boolean() });
    process.env.GEMINI_AI_ENABLED = "true";
    process.env.GEMINI_API_KEY = "AIzaSyLeakShouldNeverSurface987654";

    // Invalid key (401/403) + secret redaction
    const invalidKey = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "q",
      clientFactory: () =>
        ({
          models: {
            generateContent: async () => {
              throw new Error(
                "401 API key invalid https://api.example/?key=AIzaSyAnotherKey1234567890 x-goog-api-key: AIzaSyLeakShouldNeverSurface987654"
              );
            },
          },
        }) as never,
    });
    expect(invalidKey.ok).toBe(false);
    expect(invalidKey.errorCode).toBe("INVALID_API_KEY");
    expect(invalidKey.message).not.toContain("AIzaSy");

    // Quota 429
    const quota = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "q",
      clientFactory: () =>
        ({
          models: {
            generateContent: async () => {
              throw new Error("429 RESOURCE_EXHAUSTED quota exceeded");
            },
          },
        }) as never,
    });
    expect(quota.ok).toBe(false);
    expect(quota.errorCode).toBe("QUOTA_EXCEEDED");

    // Model fallback when primary model reports 404
    const seenModels: string[] = [];
    const fallbackSuccess = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "q",
      fallbackModels: ["gemini-backup-model"],
      clientFactory: () =>
        ({
          models: {
            generateContent: async (args: { model: string }) => {
              seenModels.push(args.model);
              if (seenModels.length === 1) {
                throw new Error("404 model not found");
              }
              return { text: JSON.stringify({ ok: true }) };
            },
          },
        }) as never,
    });
    expect(fallbackSuccess.ok).toBe(true);
    expect(fallbackSuccess.modelUsed).toBe("gemini-backup-model");
    expect(seenModels.length).toBe(2);

    // Pre-aborted signal returns TIMEOUT immediately
    const abortedController = new AbortController();
    abortedController.abort();
    const cancelled = await generateStructuredWithGemini({
      schema: simpleSchema,
      systemInstruction: "sys",
      userPrompt: "q",
      signal: abortedController.signal,
      clientFactory: () =>
        ({
          models: { generateContent: async () => ({ text: JSON.stringify({ ok: true }) }) },
        }) as never,
    });
    expect(cancelled.ok).toBe(false);
    expect(cancelled.errorCode).toBe("TIMEOUT");
  });

  test("all 6 runGemini wrappers invoke @google/genai, parse valid responses, and run safety policies", async () => {
    process.env.GEMINI_AI_ENABLED = "true";
    process.env.GEMINI_API_KEY = "test-gemini-integration-key-1234";

    const forecast = getDemoForecast("new-delhi");
    const ctx = buildGeminiAirQualityContext(forecast, DEFAULT_FAMILY_PROFILE, "en");
    const comparison = compareTransportScenarios({
      baseline: {
        mode: "car_petrol",
        roundTripDistanceKm: 18,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1,
      },
      alternative: {
        mode: "metro_rail",
        roundTripDistanceKm: 18,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1,
      },
    });

    const chatRes = buildDeterministicChatFallback(ctx, "en");
    chatRes.reply = "Current Delhi AQI is 195. Wear a well-fitting N95 mask outdoors.";
    generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(chatRes) });
    const chat = await runGeminiChat({
      context: ctx,
      message: "Should I wear a mask today?",
      history: [],
      locale: "en",
    });
    expect(chat.ok).toBe(true);
    expect(chat.aiGenerated).toBe(true);

    const planRes = buildDeterministicDailyPlanFallback(ctx, "en");
    generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(planRes) });
    const plan = await runGeminiDailyPlan({ context: ctx, locale: "en" });
    expect(plan.ok).toBe(true);

    const indoorRes = buildDeterministicIndoorFallback(ctx);
    generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(indoorRes) });
    const indoor = await runGeminiIndoorCoach({
      context: ctx,
      roomFocus: "bedroom",
      cookingStyle: "lpg_gas",
      budgetTier: "low_cost",
      hasPurifier: false,
      locale: "en",
    });
    expect(indoor.ok).toBe(true);

    const sustRes = buildDeterministicSustainabilityFallback(ctx);
    generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(sustRes) });
    const sust = await runGeminiSustainability({
      context: ctx,
      focusArea: "daily_commute",
      budgetTier: "free_only",
      locale: "en",
    });
    expect(sust.ok).toBe(true);

    const commRes = buildDeterministicCommunityFallback(ctx, "school");
    generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(commRes) });
    const comm = await runGeminiCommunityPlan({
      context: ctx,
      communityType: "school",
      approxPopulation: 400,
      budgetTier: "low_cost",
      timeframe: "weekly",
      locale: "en",
    });
    expect(comm.ok).toBe(true);

    const impactRes = buildDeterministicImpactFallback(ctx, comparison, "en");
    generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(impactRes) });
    const impact = await runGeminiImpactExplanation({
      context: ctx,
      comparison,
      locale: "en",
    });
    expect(impact.ok).toBe(true);
  });

  test("all deterministic EN and HI fallback builders satisfy strict Zod schemas", () => {
    const forecast = getDemoForecast("mumbai");
    const comparison = compareTransportScenarios({
      baseline: {
        mode: "car_petrol",
        roundTripDistanceKm: 12,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
      alternative: {
        mode: "bus",
        roundTripDistanceKm: 12,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
    });

    for (const locale of ["en", "hi"] as const) {
      const ctx = buildGeminiAirQualityContext(forecast, DEFAULT_FAMILY_PROFILE, locale);
      expect(aiChatResponseSchema.safeParse(buildDeterministicChatFallback(ctx, locale)).success).toBe(true);
      expect(aiDailyPlanResponseSchema.safeParse(buildDeterministicDailyPlanFallback(ctx, locale)).success).toBe(true);
      expect(aiIndoorAirResponseSchema.safeParse(buildDeterministicIndoorFallback(ctx)).success).toBe(true);
      expect(aiSustainabilityResponseSchema.safeParse(buildDeterministicSustainabilityFallback(ctx)).success).toBe(true);
      expect(aiCommunityPlanResponseSchema.safeParse(buildDeterministicCommunityFallback(ctx, "residential_society")).success).toBe(true);
      expect(aiImpactExplainResponseSchema.safeParse(buildDeterministicImpactFallback(ctx, comparison, locale)).success).toBe(true);
    }
  });

  test("open-meteo handles timezone offsets, schema errors, network failures, stale cache, and geocoding ranking", async () => {
    expect(toOffsetIsoTimestamp("2026-11-27T18:30", 19800)).toBe(
      "2026-11-27T18:30:00+05:30"
    );
    expect(toOffsetIsoTimestamp("2026-11-27T05:00:00", -18000)).toBe(
      "2026-11-27T05:00:00-05:00"
    );
    expect(normalizeLocationQuery("  delhi ")).toBe("New Delhi");
    expect(normalizeLocationQuery("bombay")).toBe("Mumbai");
    expect(normalizeLocationQuery("  Jaipur  ")).toBe("Jaipur");

    const delhi = getDemoForecast("new-delhi").location;
    expect(() => normalizeOpenMeteoAirQuality("bad", delhi)).toThrowError(
      UpstreamApiError
    );

    const normalized = normalizeOpenMeteoAirQuality(
      {
        latitude: 28.6139,
        longitude: 77.209,
        timezone: "GMT",
        utc_offset_seconds: 19800,
        current: { time: "2026-11-27T23:00", us_aqi: 145, pm2_5: 55, ozone: null },
        hourly: {
          time: ["2026-11-27T23:00", "2026-11-28T00:00"],
          us_aqi: [145, 160],
          pm2_5: [55, 62],
        },
      },
      delhi
    );
    expect(normalized.location.timezone).toBe("Asia/Kolkata");
    expect(normalized.current.pollutants.o3).toBeNull();
    expect(normalized.hourly[1]?.timestampIso).toBe("2026-11-28T00:00:00+05:30");

    const aqService = new OpenMeteoAirQualityService();
    const demoFallback = aqService.getDemonstrationFallback(delhi);
    expect(demoFallback.location.id).toBe(delhi.id);

    // Network failure without cached value throws UpstreamApiError
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      aqService.getForecast(
        { ...delhi, id: "no-cache", latitude: 11.11, longitude: 77.77 },
        { forecastDays: 1 }
      )
    ).rejects.toThrow(UpstreamApiError);

    // HTTP 500 throws UpstreamApiError
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    await expect(
      aqService.getForecast(
        { ...delhi, id: "http-500", latitude: 12.12, longitude: 76.76 },
        { forecastDays: 1 }
      )
    ).rejects.toThrow(UpstreamApiError);

    // Geocoding service: short query, Indian ranking boost, cache hit, bad schema
    const geoService = new OpenMeteoGeocodingService();
    expect(await geoService.searchLocations("a")).toEqual([]);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 1,
            name: "Indore Test",
            country: "United States",
            country_code: "US",
            latitude: 30,
            longitude: -90,
            population: 500_000,
          },
          {
            id: 2,
            name: "Indore",
            country: "India",
            country_code: "IN",
            latitude: 22.72,
            longitude: 75.86,
            population: 2_000_000,
          },
        ],
      }),
    } as Response);

    const geoResults = await geoService.searchLocations("Indore", 5);
    expect(geoResults[0]?.countryCode).toBe("IN");

    // Bad schema throws 502 VALIDATION_ERROR
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ badField: true }] }),
    } as Response);
    await expect(geoService.searchLocations("BadSchemaCity")).rejects.toThrow(
      UpstreamApiError
    );
  });
});
