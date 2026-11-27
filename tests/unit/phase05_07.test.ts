// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  EMISSION_FACTOR_REGISTRY,
  EMISSION_FACTOR_REGISTRY_VERSION,
} from "@/lib/impact/emission-factors";
import {
  compareTransportScenarios,
  formatSignedCo2eDiff,
} from "@/lib/impact/transport-calculator";
import { parseAndValidateAiRequest } from "@/lib/ai/route-helper";
import { getServerEnv } from "@/config/env";
import manifest from "@/app/manifest";
import { z } from "zod";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Phase 05–07 Audited Emission Factors, Zero Formatting, PWA & Rate Limit Configuration", () => {
  test("emission factor registry includes audited tableReference, gasBasis, and isDerivedEstimate fields", () => {
    expect(EMISSION_FACTOR_REGISTRY_VERSION).toBe("2026.11-audit-v5");

    for (const entry of Object.values(EMISSION_FACTOR_REGISTRY)) {
      expect(entry.tableReference.length).toBeGreaterThan(10);
      expect(["CO2", "CO2e", "zero_operational"]).toContain(entry.gasBasis);
      expect(typeof entry.isDerivedEstimate).toBe("boolean");
    }

    expect(EMISSION_FACTOR_REGISTRY.car_electric.isDerivedEstimate).toBe(true);
    expect(EMISSION_FACTOR_REGISTRY.car_electric.gasBasis).toBe("CO2");
    expect(EMISSION_FACTOR_REGISTRY.car_cng.numericalFactorKgCo2e).toBe(0.068);
    expect(EMISSION_FACTOR_REGISTRY.walk.gasBasis).toBe("zero_operational");
    expect(EMISSION_FACTOR_REGISTRY.work_from_home.gasBasis).toBe(
      "zero_operational"
    );
  });

  test("formatSignedCo2eDiff never produces -0.00 or negative zero on zero distance comparisons", () => {
    expect(formatSignedCo2eDiff(0, 2)).toBe("0.00");
    expect(formatSignedCo2eDiff(-0, 2)).toBe("0.00");
    expect(formatSignedCo2eDiff(0.0004, 2)).toBe("0.00");
    expect(formatSignedCo2eDiff(-0.0004, 2)).toBe("0.00");
    expect(formatSignedCo2eDiff(1.25, 2)).toBe("−1.25");
    expect(formatSignedCo2eDiff(-1.25, 2)).toBe("+1.25");

    const zeroCompare = compareTransportScenarios({
      baseline: {
        mode: "car_petrol",
        roundTripDistanceKm: 0,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
        occupancy: 1,
      },
      alternative: {
        mode: "metro_rail",
        roundTripDistanceKm: 0,
        travelDaysPerWeek: 5,
        workingWeeksPerYear: 48,
      },
    });

    expect(Object.is(zeroCompare.avoidedDailyKgCo2e, -0)).toBe(false);
    expect(Object.is(zeroCompare.avoidedAnnualKgCo2e, -0)).toBe(false);
    expect(formatSignedCo2eDiff(zeroCompare.avoidedDailyKgCo2e, 2)).toBe("0.00");
    expect(formatSignedCo2eDiff(zeroCompare.avoidedAnnualKgCo2e, 1)).toBe("0.0");
    expect(zeroCompare.isNegativeSavings).toBe(false);
  });

  test("configurable AI_RATE_LIMIT_PER_MIN defaults cleanly and enforces configured limit", async () => {
    vi.stubEnv("AI_RATE_LIMIT_PER_MIN", "");
    expect(getServerEnv().AI_RATE_LIMIT_PER_MIN).toBe(15);

    vi.stubEnv("AI_RATE_LIMIT_PER_MIN", "2");
    expect(getServerEnv().AI_RATE_LIMIT_PER_MIN).toBe(2);

    const schema = z.object({ ping: z.string() });
    const bucket = `test-rate-${Date.now()}`;
    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "203.0.113.55",
        },
        body: JSON.stringify({ ping: "ok" }),
      });

    const r1 = await parseAndValidateAiRequest(makeReq(), schema, bucket);
    const r2 = await parseAndValidateAiRequest(makeReq(), schema, bucket);
    const r3 = await parseAndValidateAiRequest(makeReq(), schema, bucket);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.response.status).toBe(429);
    }
  });

  test("PWA manifest and service worker keep API routes and sensitive data strictly uncached", () => {
    const webManifest = manifest();
    expect(webManifest.name).toContain("VayuWise AI");
    expect(webManifest.start_url).toBe("/dashboard");
    expect(webManifest.display).toBe("standalone");

    const swSource = readFileSync(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8"
    );
    expect(swSource).toContain('url.pathname.startsWith("/api/")');
    expect(swSource).toContain("url.origin !== self.location.origin");
    expect(swSource).toContain('url.pathname.startsWith("/_next/static/")');
  });
});
