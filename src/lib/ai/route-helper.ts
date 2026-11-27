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
import type { GeminiExecutionResult } from "@/services/gemini/gemini-service";
import type {
  AirQualityForecast,
  FamilyProfile,
  GeoLocation,
  Locale,
} from "@/types/domain";

const MAX_BODY_BYTES = 32_768; // 32 KB request size cap

/**
 * Extracts a client IP address while resisting spoofing in standalone Node
 * deployments.
 *
 * - On Vercel (`VERCEL=1`), trusts platform-managed `x-vercel-forwarded-for`
 *   then `x-real-ip`, ignoring client-appendable `x-forwarded-for`.
 * - Behind an explicit reverse proxy (`TRUST_PROXY_HEADERS=true`) or during
 *   unit tests (`NODE_ENV=test`), accepts forwarded proxy headers in strict
 *   trust precedence.
 * - In unproxied/unsupported deployments, ignores client-supplied forwarding
 *   headers and collapses requests into a shared conservative bucket.
 */
export function getClientIp(req: NextRequest): string {
  const isVercel = process.env.VERCEL === "1";
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "true";
  const isTest = process.env.NODE_ENV === "test";

  if (!isVercel && !trustProxy && !isTest) {
    return "untrusted-proxy-client";
  }

  const vercelIp = req.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (vercelIp) return vercelIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  if (trustProxy || isTest) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }
  }

  return isVercel ? "vercel-client" : "local";
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

export function buildContextMeta(context: GeminiAirQualityContext) {
  return {
    locationName: context.location.name,
    timezone: context.location.timezone,
    usAqi: context.current.usAqi,
    severityLabel: context.current.severityLabel,
    dataSourceType: context.provenance.dataSourceType,
    aqiStandard: context.provenance.aqiStandard,
    modelTimestampIso: context.provenance.modelTimestampIso,
    freshnessStatus: context.provenance.freshnessStatus,
    isStale: context.provenance.isStale,
  };
}

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
}): Response {
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
      contextMeta: buildContextMeta(params.context),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Formats consistent server-side AI failure responses with deterministic fallback
 * payloads, normalized HTTP status mapping, and `Cache-Control: no-store`.
 */
export function formatAiRouteError<TFallback>(params: {
  errorCode?: string;
  message: string;
  fallbackData: TFallback;
  context: GeminiAirQualityContext;
  extra?: Record<string, unknown>;
}): Response {
  const code = params.errorCode ?? "UPSTREAM_ERROR";
  const status =
    code === "UNCONFIGURED" || code === "AI_DISABLED"
      ? 503
      : code === "QUOTA_EXCEEDED" || code === "RATE_LIMITED"
        ? 429
        : 502;

  return Response.json(
    {
      ok: false,
      aiGenerated: false,
      errorCode: code,
      message: params.message,
      fallbackData: params.fallbackData,
      ...params.extra,
      contextMeta: buildContextMeta(params.context),
    },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Shared POST lifecycle handler for `/api/ai/*` routes: enforces origin checks,
 * rate limits, 32 KB body cap, schema validation, server-side AQI resolution,
 * and normalized Gemini success/fallback formatting.
 */
export async function handleAiPostRequest<
  TReq extends { locale: Locale; location: GeoLocation; profile?: FamilyProfile },
  TRes extends { sourceIds?: string[] },
>(params: {
  request: NextRequest;
  schema: z.ZodType<TReq>;
  rateBucketPrefix: string;
  defaultErrorMessage: string;
  execute: (args: {
    data: TReq;
    context: GeminiAirQualityContext;
    signal: AbortSignal;
  }) => Promise<{
    result: GeminiExecutionResult<TRes>;
    fallbackData: TRes;
    extraError?: Record<string, unknown>;
  }>;
}): Promise<Response> {
  const parsed = await parseAndValidateAiRequest(
    params.request,
    params.schema,
    params.rateBucketPrefix
  );
  if (!parsed.ok) return parsed.response;

  const { context } = await resolveServerAiContext({
    location: parsed.data.location,
    profile: parsed.data.profile,
    locale: parsed.data.locale,
    signal: params.request.signal,
  });

  const { result, fallbackData, extraError } = await params.execute({
    data: parsed.data,
    context,
    signal: params.request.signal,
  });

  if (result.ok && result.data) {
    return formatAiRouteSuccess({
      data: result.data,
      aiGenerated: true,
      modelUsed: result.modelUsed,
      usage: result.usage,
      latencyMs: result.latencyMs,
      safety: result.safety,
      context,
    });
  }

  return formatAiRouteError({
    errorCode: result.errorCode,
    message: result.message ?? params.defaultErrorMessage,
    fallbackData,
    context,
    extra: extraError,
  });
}
