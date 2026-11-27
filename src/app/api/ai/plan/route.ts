import type { NextRequest } from "next/server";
import { buildDeterministicDailyPlanFallback } from "@/lib/ai/fallbacks";
import { handleAiPostRequest } from "@/lib/ai/route-helper";
import { aiDailyPlanRequestSchema } from "@/lib/ai/schemas";
import { runGeminiDailyPlan } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleAiPostRequest({
    request,
    schema: aiDailyPlanRequestSchema,
    rateBucketPrefix: "ai-plan",
    defaultErrorMessage: "Gemini daily planner unavailable.",
    execute: async ({ data, context, signal }) => ({
      result: await runGeminiDailyPlan({
        context,
        scheduleNote: data.scheduleNote,
        locale: data.locale,
        signal,
      }),
      fallbackData: buildDeterministicDailyPlanFallback(context, data.locale),
    }),
  });
}
