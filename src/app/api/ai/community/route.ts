import type { NextRequest } from "next/server";
import { buildDeterministicCommunityFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteSuccess,
  parseAndValidateAiRequest,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { aiCommunityPlanRequestSchema } from "@/lib/ai/schemas";
import { runGeminiCommunityPlan } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidateAiRequest(
    request,
    aiCommunityPlanRequestSchema,
    "ai-community"
  );
  if (!parsed.ok) return parsed.response;

  const {
    locale,
    location,
    communityType,
    approxPopulation,
    budgetTier,
    timeframe,
    availableResources,
  } = parsed.data;

  const { context } = await resolveServerAiContext({
    location,
    locale,
    signal: request.signal,
  });

  const result = await runGeminiCommunityPlan({
    context,
    communityType,
    approxPopulation,
    budgetTier,
    timeframe,
    availableResources,
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
      message: result.message ?? "Gemini community planner unavailable.",
      fallbackData: buildDeterministicCommunityFallback(context, communityType),
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
