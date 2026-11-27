import type { NextRequest } from "next/server";
import { buildDeterministicSustainabilityFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteError,
  formatAiRouteSuccess,
  parseAndValidateAiRequest,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { aiSustainabilityRequestSchema } from "@/lib/ai/schemas";
import { runGeminiSustainability } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidateAiRequest(
    request,
    aiSustainabilityRequestSchema,
    "ai-sustainability"
  );
  if (!parsed.ok) return parsed.response;

  const { locale, location, profile, focusArea, budgetTier } = parsed.data;

  const { context } = await resolveServerAiContext({
    location,
    profile,
    locale,
    signal: request.signal,
  });

  const result = await runGeminiSustainability({
    context,
    focusArea,
    budgetTier: budgetTier ?? context.nonSensitiveProfileSummary.budgetTier,
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
    message: result.message ?? "Gemini sustainability coach unavailable.",
    fallbackData: buildDeterministicSustainabilityFallback(context),
    context,
  });
}
