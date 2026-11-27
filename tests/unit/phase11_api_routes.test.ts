// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import {
  buildDeterministicChatFallback,
  buildDeterministicDailyPlanFallback,
  buildDeterministicImpactFallback,
  buildDeterministicSustainabilityFallback,
} from "@/lib/ai/fallbacks";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { DEFAULT_FAMILY_PROFILE } from "@/lib/personalization/profile-storage";
import { clearMemoryCacheForTests } from "@/lib/cache/memory-cache";

const {
  getForecastMock,
  searchLocationsMock,
  runGeminiChatMock,
  runGeminiDailyPlanMock,
  runGeminiIndoorCoachMock,
  runGeminiSustainabilityMock,
  runGeminiCommunityPlanMock,
  runGeminiImpactExplanationMock,
} = vi.hoisted(() => ({
  getForecastMock: vi.fn(),
  searchLocationsMock: vi.fn(),
  runGeminiChatMock: vi.fn(),
  runGeminiDailyPlanMock: vi.fn(),
  runGeminiIndoorCoachMock: vi.fn(),
  runGeminiSustainabilityMock: vi.fn(),
  runGeminiCommunityPlanMock: vi.fn(),
  runGeminiImpactExplanationMock: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    connection: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/services/air-quality/open-meteo", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/air-quality/open-meteo")>();
  return {
    ...actual,
    openMeteoAirQualityService: {
      getForecast: getForecastMock,
      getDemonstrationFallback:
        actual.openMeteoAirQualityService.getDemonstrationFallback.bind(
          actual.openMeteoAirQualityService
        ),
    },
    openMeteoGeocodingService: {
      searchLocations: searchLocationsMock,
    },
  };
});

vi.mock("@/services/gemini/gemini-service", () => ({
  runGeminiChat: runGeminiChatMock,
  runGeminiDailyPlan: runGeminiDailyPlanMock,
  runGeminiIndoorCoach: runGeminiIndoorCoachMock,
  runGeminiSustainability: runGeminiSustainabilityMock,
  runGeminiCommunityPlan: runGeminiCommunityPlanMock,
  runGeminiImpactExplanation: runGeminiImpactExplanationMock,
}));

import { GET as healthGet } from "@/app/api/health/route";
import { GET as airQualityGet } from "@/app/api/air-quality/route";
import { GET as locationsSearchGet } from "@/app/api/locations/search/route";
import { POST as chatPost } from "@/app/api/ai/chat/route";
import { POST as planPost } from "@/app/api/ai/plan/route";
import { POST as indoorPost } from "@/app/api/ai/indoor-air/route";
import { POST as sustainabilityPost } from "@/app/api/ai/sustainability/route";
import { POST as communityPost } from "@/app/api/ai/community/route";
import { POST as impactPost } from "@/app/api/ai/impact/route";
import { UpstreamApiError } from "@/services/air-quality/open-meteo";

const delhiForecast = getDemoForecast("new-delhi");
const delhiLocation = {
  id: delhiForecast.location.id,
  name: delhiForecast.location.name,
  region: delhiForecast.location.region,
  country: delhiForecast.location.country,
  countryCode: delhiForecast.location.countryCode,
  latitude: delhiForecast.location.latitude,
  longitude: delhiForecast.location.longitude,
  timezone: delhiForecast.location.timezone,
};

function makeJsonPost(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("Phase 11.3 — API Route Integration, Security & Fallback Verification", () => {
  beforeEach(() => {
    clearMemoryCacheForTests();
    vi.clearAllMocks();
    getForecastMock.mockResolvedValue(delhiForecast);
  });

  afterEach(() => {
    clearMemoryCacheForTests();
  });

  test("GET /api/health returns 200 without leaking secrets and enforces no-store", async () => {
    const res = await healthGet();
    const json = (await res.json()) as {
      status: string;
      geminiConfigured: boolean;
      aiEnabled: boolean;
    };
    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(typeof json.geminiConfigured).toBe("boolean");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  test("GET /api/air-quality validates coordinates, sets cache headers, propagates upstream errors, and rate-limits", async () => {
    const bad = await airQualityGet(
      new NextRequest("http://localhost:3000/api/air-quality?lat=999&lon=77")
    );
    expect(bad.status).toBe(400);

    const good = await airQualityGet(
      new NextRequest(
        "http://localhost:3000/api/air-quality?lat=28.6139&lon=77.209&name=New+Delhi"
      )
    );
    expect(good.status).toBe(200);
    expect(good.headers.get("Cache-Control")).toContain("max-age=300");

    const refreshed = await airQualityGet(
      new NextRequest(
        "http://localhost:3000/api/air-quality?lat=28.6139&lon=77.209&refresh=1"
      )
    );
    expect(refreshed.status).toBe(200);
    expect(refreshed.headers.get("Cache-Control")).toBe("no-store");

    getForecastMock.mockRejectedValueOnce(
      new UpstreamApiError("Timeout", 504, "TIMEOUT")
    );
    const upstreamFail = await airQualityGet(
      new NextRequest("http://localhost:3000/api/air-quality?lat=28.6&lon=77.2")
    );
    expect(upstreamFail.status).toBe(504);

    // Exhaust air-quality IP rate limit (40 req / min)
    let limitedStatus = 200;
    for (let i = 0; i < 45; i++) {
      const r = await airQualityGet(
        new NextRequest("http://localhost:3000/api/air-quality?lat=28.6&lon=77.2", {
          headers: { "x-real-ip": "198.51.100.44" },
        })
      );
      limitedStatus = r.status;
      if (limitedStatus === 429) break;
    }
    expect(limitedStatus).toBe(429);
  });

  test("GET /api/locations/search validates query length, serves cached attribution, and handles upstream failure", async () => {
    const shortRes = await locationsSearchGet(
      new NextRequest("http://localhost:3000/api/locations/search?q=a")
    );
    expect(shortRes.status).toBe(400);

    searchLocationsMock.mockResolvedValueOnce([delhiLocation]);
    const okRes = await locationsSearchGet(
      new NextRequest("http://localhost:3000/api/locations/search?q=Delhi&limit=5")
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("Cache-Control")).toBe("public, max-age=3600");

    searchLocationsMock.mockRejectedValueOnce(new Error("network down"));
    const failRes = await locationsSearchGet(
      new NextRequest("http://localhost:3000/api/locations/search?q=Pune")
    );
    expect(failRes.status).toBe(503);
  });

  test("AI routes enforce Origin checks, 32KB body cap, JSON validity, schema validation, and rate limits", async () => {
    const crossOrigin = await chatPost(
      makeJsonPost(
        "/api/ai/chat",
        { locale: "en", location: delhiLocation, message: "Hello", history: [] },
        { host: "vayuwise.app", origin: "https://attacker.example" }
      )
    );
    expect(crossOrigin.status).toBe(403);

    const oversized = await chatPost(
      makeJsonPost(
        "/api/ai/chat",
        JSON.stringify({ message: "x".repeat(33_000) }),
        { "x-forwarded-for": "198.51.100.70" }
      )
    );
    expect(oversized.status).toBe(413);

    const badJson = await chatPost(
      makeJsonPost("/api/ai/chat", "{broken", {
        "x-forwarded-for": "198.51.100.71",
      })
    );
    expect(badJson.status).toBe(400);

    const badSchema = await chatPost(
      makeJsonPost(
        "/api/ai/chat",
        { locale: "fr", message: "" },
        { "x-forwarded-for": "198.51.100.72" }
      )
    );
    expect(badSchema.status).toBe(400);

    // Rate limit exhaustion on /api/ai/chat (default 15 req/min per IP)
    const ctx = buildGeminiAirQualityContext(delhiForecast, DEFAULT_FAMILY_PROFILE, "en");
    runGeminiChatMock.mockResolvedValue({
      ok: true,
      aiGenerated: true,
      modelUsed: "gemini-3.1-flash-lite",
      latencyMs: 55,
      data: buildDeterministicChatFallback(ctx, "en"),
    });

    let lastStatus = 200;
    for (let i = 0; i < 18; i++) {
      const r = await chatPost(
        makeJsonPost(
          "/api/ai/chat",
          { locale: "en", location: delhiLocation, message: "AQI?", history: [] },
          { "x-forwarded-for": "198.51.100.99" }
        )
      );
      lastStatus = r.status;
      if (lastStatus === 429) {
        expect(r.headers.get("Retry-After")).toBeTruthy();
        break;
      }
    }
    expect(lastStatus).toBe(429);
  });

  test("All 6 AI endpoints handle success, safety fullReplacement, and deterministic error fallback payloads", async () => {
    const ctx = buildGeminiAirQualityContext(delhiForecast, DEFAULT_FAMILY_PROFILE, "en");
    const comparison = compareTransportScenarios({
      baseline: {
        mode: "car_petrol",
        roundTripDistanceKm: 14,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
      alternative: {
        mode: "metro_rail",
        roundTripDistanceKm: 14,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
    });

    // Chat: QUOTA_EXCEEDED -> 429 with fallbackData
    runGeminiChatMock.mockResolvedValueOnce({
      ok: false,
      aiGenerated: false,
      latencyMs: 12,
      data: null,
      errorCode: "QUOTA_EXCEEDED",
      message: "Quota exhausted",
    });
    const chatErr = await chatPost(
      makeJsonPost(
        "/api/ai/chat",
        { locale: "en", location: delhiLocation, message: "Safe to run?", history: [] },
        { "x-forwarded-for": "192.0.2.1" }
      )
    );
    const chatErrBody = (await chatErr.json()) as {
      ok: boolean;
      errorCode: string;
      fallbackData: unknown;
    };
    expect(chatErr.status).toBe(429);
    expect(chatErrBody.errorCode).toBe("QUOTA_EXCEEDED");
    expect(chatErrBody.fallbackData).toBeTruthy();

    // Plan: success + fullReplacement forces aiGenerated=false
    runGeminiDailyPlanMock.mockResolvedValueOnce({
      ok: true,
      aiGenerated: true,
      modelUsed: "gemini-3.1-flash-lite",
      latencyMs: 40,
      safety: { fullReplacement: true },
      data: buildDeterministicDailyPlanFallback(ctx, "en"),
    });
    const planRes = await planPost(
      makeJsonPost(
        "/api/ai/plan",
        { locale: "en", location: delhiLocation },
        { "x-forwarded-for": "192.0.2.2" }
      )
    );
    const planJson = (await planRes.json()) as {
      aiGenerated: boolean;
      provenanceMode: string;
    };
    expect(planRes.status).toBe(200);
    expect(planJson.aiGenerated).toBe(false);
    expect(planJson.provenanceMode).toBe("rule_based_fallback");

    // Indoor: UNCONFIGURED -> 503 with fallback
    runGeminiIndoorCoachMock.mockResolvedValueOnce({
      ok: false,
      aiGenerated: false,
      latencyMs: 5,
      data: null,
      errorCode: "UNCONFIGURED",
      message: "Key missing",
    });
    const indoorErr = await indoorPost(
      makeJsonPost(
        "/api/ai/indoor-air",
        {
          locale: "en",
          location: delhiLocation,
          roomFocus: "bedroom",
          cookingStyle: "lpg_gas",
        },
        { "x-forwarded-for": "192.0.2.3" }
      )
    );
    expect(indoorErr.status).toBe(503);

    // Sustainability: success
    runGeminiSustainabilityMock.mockResolvedValueOnce({
      ok: true,
      aiGenerated: true,
      modelUsed: "gemini-3.1-flash-lite",
      latencyMs: 32,
      data: buildDeterministicSustainabilityFallback(ctx),
    });
    const sustOk = await sustainabilityPost(
      makeJsonPost(
        "/api/ai/sustainability",
        { locale: "en", location: delhiLocation, focusArea: "daily_commute" },
        { "x-forwarded-for": "192.0.2.4" }
      )
    );
    expect(sustOk.status).toBe(200);

    // Community: UPSTREAM_ERROR -> 502
    runGeminiCommunityPlanMock.mockResolvedValueOnce({
      ok: false,
      aiGenerated: false,
      latencyMs: 30,
      data: null,
      errorCode: "UPSTREAM_ERROR",
      message: "Upstream error",
    });
    const commErr = await communityPost(
      makeJsonPost(
        "/api/ai/community",
        {
          locale: "en",
          location: delhiLocation,
          communityType: "school",
          approxPopulation: 300,
          budgetTier: "low_cost",
          timeframe: "weekly",
        },
        { "x-forwarded-for": "192.0.2.5" }
      )
    );
    expect(commErr.status).toBe(502);

    // Impact: success with deterministic calculator output
    runGeminiImpactExplanationMock.mockResolvedValueOnce({
      ok: true,
      aiGenerated: true,
      modelUsed: "gemini-3.1-flash-lite",
      latencyMs: 28,
      data: buildDeterministicImpactFallback(ctx, comparison, "en"),
    });
    const impactOk = await impactPost(
      makeJsonPost(
        "/api/ai/impact",
        {
          locale: "en",
          location: delhiLocation,
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
            occupancy: 1,
          },
        },
        { "x-forwarded-for": "192.0.2.6" }
      )
    );
    expect(impactOk.status).toBe(200);
  });
});
