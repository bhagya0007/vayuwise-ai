import type { NextRequest } from "next/server";
import { buildDeterministicIndoorFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteError,
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

  return formatAiRouteError({
    errorCode: result.errorCode,
    message: result.message ?? "Gemini indoor coach unavailable.",
    fallbackData: buildDeterministicIndoorFallback(context),
    context,
  });
}
