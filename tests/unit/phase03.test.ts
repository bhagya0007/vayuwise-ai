// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as chatPost } from "@/app/api/ai/chat/route";
import { POST as planPost } from "@/app/api/ai/plan/route";
import { clearMemoryCacheForTests } from "@/lib/cache/memory-cache";
import { aiChatResponseSchema } from "@/lib/ai/schemas";
import { sanitizeModelText } from "@/lib/ai/safety";
import { formatHourInTz } from "@/lib/air-quality/intelligence";
import { openMeteoAirQualityService } from "@/services/air-quality/open-meteo";
import { generateStructuredWithGemini } from "@/services/gemini/gemini-service";
import { DEMO_LOCATIONS, getDemoForecast } from "@/lib/demo/air-quality-demo";

const NEW_DELHI = DEMO_LOCATIONS[0];

beforeEach(() => {
  clearMemoryCacheForTests();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Phase 03 Gemini Service, Routes & Phase 02 Regressions", () => {
  test("returns UNCONFIGURED gracefully when GEMINI_API_KEY is absent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "hi",
    });

    expect(res.ok).toBe(false);
    expect(res.aiGenerated).toBe(false);
    expect(res.errorCode).toBe("UNCONFIGURED");
  });

  test("respects GEMINI_AI_ENABLED=false emergency kill-switch", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-123456");
    vi.stubEnv("GEMINI_AI_ENABLED", "false");

    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "hi",
    });

    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("AI_DISABLED");
  });

  test("validates structured Gemini response and performs bounded corrective retry on bad JSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-test-key-000");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");

    const generateContentMock = vi
      .fn()
      .mockResolvedValueOnce({ text: "{invalid-json" })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          reply: "Keep windows closed during morning inversion.",
          recommendations: [],
          cautions: ["Modeled estimate only."],
          sourceIds: ["WHO_AQG_2021"],
          dataBasis: "Open-Meteo / CAMS",
          whyThisRecommendation: "High PM2.5",
          disclaimer: "Not medical advice.",
        }),
        usageMetadata: {
          promptTokenCount: 120,
          candidatesTokenCount: 45,
          totalTokenCount: 165,
        },
      });

    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "prompt",
      clientFactory: () =>
        ({
          models: { generateContent: generateContentMock },
        }) as never,
    });

    expect(res.ok).toBe(true);
    expect(res.aiGenerated).toBe(true);
    expect(res.modelUsed).toBe("gemini-3.8-flash");
    expect(res.usage?.totalTokens).toBe(165);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry invalid API key (401/403) and redacts secrets from errors", async () => {
    vi.stubEnv("GEMINI_API_KEY", "AIzaSyFakeKey123456789012345");
    const generateContentMock = vi
      .fn()
      .mockRejectedValue(
        new Error("401 API_KEY_INVALID for AIzaSyFakeKey123456789012345")
      );

    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "prompt",
      clientFactory: () =>
        ({
          models: { generateContent: generateContentMock },
        }) as never,
    });

    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("INVALID_API_KEY");
    expect(res.message).not.toContain("AIzaSyFakeKey");
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  test("handles quota exhaustion (429 RESOURCE_EXHAUSTED) without hanging", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key-123");
    const generateContentMock = vi
      .fn()
      .mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED quota exceeded"));

    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "prompt",
      clientFactory: () =>
        ({
          models: { generateContent: generateContentMock },
        }) as never,
    });

    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("QUOTA_EXCEEDED");
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  test("POST /api/ai/chat rejects cross-origin, oversized payload, and unconfigured key truthfully", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.spyOn(openMeteoAirQualityService, "getForecast").mockResolvedValue(
      getDemoForecast("new-delhi")
    );

    // Origin mismatch -> 403
    const badOriginReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
        host: "localhost:3000",
      },
      body: JSON.stringify({ message: "hi", location: NEW_DELHI }),
    });
    const badOriginRes = await chatPost(badOriginReq);
    expect(badOriginRes.status).toBe(403);

    // Oversized body -> 413
    const hugeReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      body: "a".repeat(35_000),
    });
    const hugeRes = await chatPost(hugeReq);
    expect(hugeRes.status).toBe(413);

    // Unconfigured key -> 503 with deterministic fallback marked aiGenerated: false
    const unconfReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "How to protect family?",
        locale: "en",
        location: NEW_DELHI,
      }),
    });
    const unconfRes = await chatPost(unconfReq);
    expect(unconfRes.status).toBe(503);
    const body = await unconfRes.json();
    expect(body.ok).toBe(false);
    expect(body.aiGenerated).toBe(false);
    expect(body.errorCode).toBe("UNCONFIGURED");
    expect(body.fallbackData.reply).toContain("Deterministic Rule-Based Guidance");
  });

  test("POST /api/ai/plan rejects invalid schema with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/plan", {
      method: "POST",
      body: JSON.stringify({ locale: "fr" }),
    });
    const res = await planPost(req);
    expect(res.status).toBe(400);
  });

  test("falls back cleanly to a secondary Flash model when primary returns 503 UNAVAILABLE", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key-fallback");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    const generateContentMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE high demand"))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          reply: "Fallback Flash model response.",
          recommendations: [],
          cautions: ["Modeled estimate only."],
          sourceIds: ["WHO_AQG_2021"],
          dataBasis: "Open-Meteo / CAMS",
          whyThisRecommendation: "High PM2.5",
          disclaimer: "Not medical advice.",
        }),
      });

    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "prompt",
      fallbackModels: ["gemini-3.1-flash-lite"],
      clientFactory: () =>
        ({
          models: { generateContent: generateContentMock },
        }) as never,
    });

    expect(res.ok).toBe(true);
    expect(res.aiGenerated).toBe(true);
    expect(res.modelUsed).toBe("gemini-3.1-flash-lite");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  test("redacts configured non-AIza GEMINI_API_KEY and key query/header patterns from errors and model text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "custom-secret-token-987654");
    const generateContentMock = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "Upstream failed for custom-secret-token-987654 at https://generativelanguage.googleapis.com?key=custom-secret-token-987654 x-goog-api-key: anotherSecretKey99"
        )
      );

    const res = await generateStructuredWithGemini({
      schema: aiChatResponseSchema,
      systemInstruction: "sys",
      userPrompt: "prompt",
      clientFactory: () =>
        ({
          models: { generateContent: generateContentMock },
        }) as never,
    });

    expect(res.ok).toBe(false);
    expect(res.message).not.toContain("custom-secret-token-987654");
    expect(res.message).not.toContain("anotherSecretKey99");

    const cleaned = sanitizeModelText(
      "Leaked custom-secret-token-987654 and Bearer myBearerTok123 and ?key=secretQueryParamValue"
    );
    expect(cleaned).not.toContain("custom-secret-token-987654");
    expect(cleaned).not.toContain("myBearerTok123");
    expect(cleaned).not.toContain("secretQueryParamValue");
  });

  test("Phase 02 follow-up: UTC timestamps convert accurately across DST transition in Europe/London", () => {
    // Winter GMT (00:00Z -> 00:00) vs Summer BST (00:00Z -> 01:00)
    expect(formatHourInTz("2026-01-15T12:00:00Z", "Europe/London")).toBe("12:00");
    expect(formatHourInTz("2026-07-15T12:00:00Z", "Europe/London")).toBe("13:00");
  });
});
