import type { NextRequest } from "next/server";
import { buildDeterministicIndoorFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteSuccess,
  parseAndValidateAiRequest,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { aiIndoorAirRequestSchema } from "@/lib/ai/schemas";
import { runGeminiIndoorCoach } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidateAiRequest(
    request,
    aiIndoorAirRequestSchema,
    "ai-indoor"
  );
  if (!parsed.ok) return parsed.response;

  const {
    locale,
    location,
    profile,
    roomFocus,
    cookingStyle,
    budgetTier,
    hasPurifier,
    indoorSmokeNote,
  } = parsed.data;

  const { context } = await resolveServerAiContext({
    location,
    profile,
    locale,
    signal: request.signal,
  });

  const result = await runGeminiIndoorCoach({
    context,
    roomFocus,
    cookingStyle,
    budgetTier: budgetTier ?? context.nonSensitiveProfileSummary.budgetTier,
    hasPurifier:
      hasPurifier ?? context.nonSensitiveProfileSummary.hasHepaPurifier,
    indoorSmokeNote,
    locale,
    signal: request.signal,
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

  return Response.json(
    {
      ok: false,
      aiGenerated: false,
      errorCode: result.errorCode ?? "UPSTREAM_ERROR",
      message: result.message ?? "Gemini indoor coach unavailable.",
      fallbackData: buildDeterministicIndoorFallback(context),
      contextMeta: {
        locationName: context.location.name,
        timezone: context.location.timezone,
        usAqi: context.current.usAqi,
        severityLabel: context.current.severityLabel,
        dataSourceType: context.provenance.dataSourceType,
        aqiStandard: context.provenance.aqiStandard,
        modelTimestampIso: context.provenance.modelTimestampIso,
        freshnessStatus: context.provenance.freshnessStatus,
        isStale: context.provenance.isStale,
      },
    },
    {
      status:
        result.errorCode === "UNCONFIGURED" || result.errorCode === "AI_DISABLED"
          ? 503
          : result.errorCode === "QUOTA_EXCEEDED" || result.errorCode === "RATE_LIMITED"
            ? 429
            : 502,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
