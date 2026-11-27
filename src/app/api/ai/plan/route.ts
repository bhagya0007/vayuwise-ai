import type { NextRequest } from "next/server";
import { buildDeterministicDailyPlanFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteError,
  formatAiRouteSuccess,
  parseAndValidateAiRequest,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { aiDailyPlanRequestSchema } from "@/lib/ai/schemas";
import { runGeminiDailyPlan } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidateAiRequest(
    request,
    aiDailyPlanRequestSchema,
    "ai-plan"
  );
  if (!parsed.ok) return parsed.response;

  const { locale, location, profile, scheduleNote } = parsed.data;
  const { context } = await resolveServerAiContext({
    location,
    profile,
    locale,
    signal: request.signal,
  });

  const result = await runGeminiDailyPlan({
    context,
    scheduleNote,
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
    message: result.message ?? "Gemini daily planner unavailable.",
    fallbackData: buildDeterministicDailyPlanFallback(context, locale),
    context,
  });
}
