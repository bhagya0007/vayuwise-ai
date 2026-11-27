// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { getPublicEnv, getServerEnv, resolveAppBaseUrl } from "@/config/env";
import { isAllowedOrigin, parseAndValidateAiRequest } from "@/lib/ai/route-helper";
import { OpenMeteoAirQualityService } from "@/services/air-quality/open-meteo";
import { clearMemoryCacheForTests } from "@/lib/cache/memory-cache";
import { z } from "zod";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  clearMemoryCacheForTests();
});

describe("Phase 09 Vercel Compatibility, 48h Horizon & Public Quota Hardening", () => {
  test("retrieves a full 48 upcoming hours even mid-day by requesting 3 Open-Meteo days when forecastDays >= 2", async () => {
    const times: string[] = [];
    const vals: number[] = [];
    // Build 72 UTC hourly slots across 3 days (2026-11-27 00:00Z -> 2026-11-29 23:00Z)
    for (let i = 0; i < 72; i++) {
      const d = new Date(Date.UTC(2026, 10, 27, 0) + i * 3600_000);
      times.push(d.toISOString().slice(0, 16));
      vals.push(100 + (i % 40));
    }

    let requestedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          latitude: 28.6139,
          longitude: 77.209,
          utc_offset_seconds: 19800,
          timezone: "Asia/Kolkata",
          current: {
            time: "2026-11-27T10:00",
            us_aqi: 190,
            us_aqi_pm2_5: 190,
            us_aqi_pm10: 90,
            pm2_5: 130,
          },
          hourly: {
            time: times,
            us_aqi: vals,
            pm2_5: vals,
          },
        }),
        { status: 200 }
      );
    });

    const svc = new OpenMeteoAirQualityService();
    const res = await svc.getForecast(
      {
        id: "new-delhi",
        name: "New Delhi",
        country: "India",
        countryCode: "IN",
        latitude: 28.6139,
        longitude: 77.209,
        timezone: "Asia/Kolkata",
      },
      { forecastDays: 2 }
    );

    expect(requestedUrl).toContain("forecast_days=3");
    expect(res.hourly).toHaveLength(48);
  });

  test("resolves Vercel system URLs cleanly without hardcoding localhost in production", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "vayuwise.vercel.app");
    vi.stubEnv("VERCEL_URL", "vayuwise-git-main.vercel.app");
    expect(resolveAppBaseUrl()).toBe("https://vayuwise.vercel.app");
    expect(getPublicEnv().NEXT_PUBLIC_APP_URL).toBe("https://vayuwise.vercel.app");

    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(resolveAppBaseUrl()).toBe("https://vayuwise-git-main.vercel.app");

    vi.stubEnv("GEMINI_MODEL", "");
    expect(getServerEnv().GEMINI_MODEL).toBe("gemini-3.1-flash-lite");
  });

  test("same-origin validation supports Vercel x-forwarded-host and rejects cross-site origins", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "vayuwise.vercel.app");
    const validReq = new NextRequest("https://internal/api/ai/chat", {
      method: "POST",
      headers: {
        origin: "https://vayuwise.vercel.app",
        "x-forwarded-host": "vayuwise.vercel.app",
      },
    });
    expect(isAllowedOrigin(validReq)).toBe(true);

    const evilReq = new NextRequest("https://internal/api/ai/chat", {
      method: "POST",
      headers: {
        origin: "https://attacker.example.com",
        host: "vayuwise.vercel.app",
      },
    });
    expect(isAllowedOrigin(evilReq)).toBe(false);
  });

  test("enforces aggregate AI quota protection across mixed endpoints per IP", async () => {
    vi.stubEnv("AI_RATE_LIMIT_PER_MIN", "2");
    // aggregateLimit = min(max(2, ceil(2 * 1.5)), 30) = 3 across all buckets
    const schema = z.object({ ok: z.boolean() });
    const makeReq = () =>
      new NextRequest("https://vayuwise.vercel.app/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "198.51.100.42",
        },
        body: JSON.stringify({ ok: true }),
      });

    expect((await parseAndValidateAiRequest(makeReq(), schema, "ai-chat")).ok).toBe(true);
    expect((await parseAndValidateAiRequest(makeReq(), schema, "ai-plan")).ok).toBe(true);
    expect((await parseAndValidateAiRequest(makeReq(), schema, "ai-indoor")).ok).toBe(true);

    const fourthBlocked = await parseAndValidateAiRequest(makeReq(), schema, "ai-community");
    expect(fourthBlocked.ok).toBe(false);
    if (!fourthBlocked.ok) {
      expect(fourthBlocked.response.status).toBe(429);
    }
  });
});
