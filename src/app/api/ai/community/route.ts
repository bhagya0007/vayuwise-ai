import type { NextRequest } from "next/server";
import { buildDeterministicCommunityFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteError,
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

  return formatAiRouteError({
    errorCode: result.errorCode,
    message: result.message ?? "Gemini community planner unavailable.",
    fallbackData: buildDeterministicCommunityFallback(context, communityType),
    context,
  });
}
