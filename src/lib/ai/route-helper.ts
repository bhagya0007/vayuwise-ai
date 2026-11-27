import type { NextRequest } from "next/server";
import { z } from "zod";
import { resolveVerifiedCitations } from "@/lib/ai/knowledge-registry";
import {
  buildGeminiAirQualityContext,
  type GeminiAirQualityContext,
} from "@/lib/air-quality/gemini-context";
import { getServerEnv } from "@/config/env";
import { checkRateLimit } from "@/lib/cache/memory-cache";
import { DEFAULT_FAMILY_PROFILE } from "@/lib/personalization/profile-storage";
import { openMeteoAirQualityService } from "@/services/air-quality/open-meteo";
import type {
  AirQualityForecast,
  FamilyProfile,
  GeoLocation,
  Locale,
} from "@/types/domain";

const MAX_BODY_BYTES = 32_768; // 32 KB request size cap

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") ?? "local";
}

export function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser / server-to-server / test client
  const host = req.headers.get("host");
  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  if (!host && !forwardedHost) return true;

  const allowedHosts = new Set<string>();
  if (host) allowedHosts.add(host);
  if (forwardedHost) allowedHosts.add(forwardedHost);

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    try {
      allowedHosts.add(new URL(configuredUrl).host);
    } catch {
      // ignore invalid URL
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    allowedHosts.add(process.env.VERCEL_PROJECT_PRODUCTION_URL.trim());
  }
  if (process.env.VERCEL_URL?.trim()) {
    allowedHosts.add(process.env.VERCEL_URL.trim());
  }

  try {
    const parsedOrigin = new URL(origin);
    return allowedHosts.has(parsedOrigin.host);
  } catch {
    return false;
  }
}

export async function parseAndValidateAiRequest<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
  rateBucketPrefix: string
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: Response }
> {
  if (!isAllowedOrigin(req)) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, errorCode: "FORBIDDEN_ORIGIN", message: "Origin mismatch." },
        { status: 403 }
      ),
    };
  }

  const ip = getClientIp(req);
  let limitPerMin = 15;
  try {
    limitPerMin = getServerEnv().AI_RATE_LIMIT_PER_MIN;
  } catch {
    limitPerMin = 15;
  }
  const routeRate = checkRateLimit(`${rateBucketPrefix}:${ip}`, limitPerMin, 60_000);
  // Conservative per-isolate aggregate cap across all /api/ai/* endpoints per IP
  const aggregateLimit = Math.min(Math.max(limitPerMin, Math.ceil(limitPerMin * 1.5)), 30);
  const aggregateRate = checkRateLimit(`ai-aggregate:${ip}`, aggregateLimit, 60_000);
  if (!routeRate.allowed || !aggregateRate.allowed) {
    const retryAfter = Math.max(
      routeRate.allowed ? 0 : routeRate.retryAfterSeconds,
      aggregateRate.allowed ? 0 : aggregateRate.retryAfterSeconds
    );
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          errorCode: "RATE_LIMITED",
          message: "Too many AI requests. Please wait briefly before trying again.",
        },
        { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
      ),
    };
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { ok: false, errorCode: "INVALID_BODY", message: "Unable to read request body." },
        { status: 400 }
      ),
    };
  }

  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, errorCode: "PAYLOAD_TOO_LARGE", message: "Request exceeds 32 KB limit." },
        { status: 413 }
      ),
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      response: Response.json(
        { ok: false, errorCode: "INVALID_JSON", message: "Request body must be valid JSON." },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          errorCode: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid request parameters.",
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Resolves environmental context strictly server-side from Open-Meteo (or explicit demo fallback
 * marked `demonstration`), never trusting client-submitted AQI figures.
 */
export async function resolveServerAiContext(params: {
  location: GeoLocation;
  profile?: FamilyProfile;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<{ forecast: AirQualityForecast; context: GeminiAirQualityContext }> {
  const effectiveProfile = params.profile ?? {
    ...DEFAULT_FAMILY_PROFILE,
    preferredLocale: params.locale,
  };

  let forecast: AirQualityForecast;
  try {
    forecast = await openMeteoAirQualityService.getForecast(params.location, {
      forecastDays: 3,
      signal: params.signal,
    });
  } catch {
    forecast = openMeteoAirQualityService.getDemonstrationFallback(
      params.location
    );
  }

  const context = buildGeminiAirQualityContext(
    forecast,
    effectiveProfile,
    params.locale
  );

  return { forecast, context };
}

export type AiProvenanceMode =
  | "gemini"
  | "gemini_safety_adjusted"
  | "rule_based_fallback";

export function formatAiRouteSuccess<T extends { sourceIds?: string[] }>(params: {
  data: T;
  aiGenerated: boolean;
  modelUsed?: string;
  usage?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
  latencyMs: number;
  safety?: {
    conservativeOverrideApplied?: boolean;
    emergencyCareAdvisoryAdded?: boolean;
    fullReplacement?: boolean;
  };
  context: GeminiAirQualityContext;
  fallbackReason?: string;
}) {
  const fullyReplaced = Boolean(params.safety?.fullReplacement);
  const safetyAdjusted = Boolean(
    params.safety?.conservativeOverrideApplied ||
      params.safety?.emergencyCareAdvisoryAdded
  );

  // If deterministic logic completely replaced the model answer, do not label as Gemini-generated
  const effectiveAiGenerated = params.aiGenerated && !fullyReplaced;
  const provenanceMode: AiProvenanceMode = !effectiveAiGenerated
    ? "rule_based_fallback"
    : safetyAdjusted
      ? "gemini_safety_adjusted"
      : "gemini";

  return Response.json(
    {
      ok: true,
      data: params.data,
      citations: resolveVerifiedCitations(params.data.sourceIds),
      aiGenerated: effectiveAiGenerated,
      provenanceMode,
      modelUsed: params.modelUsed,
      usage: params.usage,
      latencyMs: params.latencyMs,
      safety: params.safety,
      fallbackReason: params.fallbackReason,
      contextMeta: {
        locationName: params.context.location.name,
        timezone: params.context.location.timezone,
        usAqi: params.context.current.usAqi,
        severityLabel: params.context.current.severityLabel,
        dataSourceType: params.context.provenance.dataSourceType,
        aqiStandard: params.context.provenance.aqiStandard,
        modelTimestampIso: params.context.provenance.modelTimestampIso,
        freshnessStatus: params.context.provenance.freshnessStatus,
        isStale: params.context.provenance.isStale,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
