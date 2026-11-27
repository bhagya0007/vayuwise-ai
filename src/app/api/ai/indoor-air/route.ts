import type { NextRequest } from "next/server";
import { buildDeterministicIndoorFallback } from "@/lib/ai/fallbacks";
import { handleAiPostRequest } from "@/lib/ai/route-helper";
import { aiIndoorAirRequestSchema } from "@/lib/ai/schemas";
import { runGeminiIndoorCoach } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleAiPostRequest({
    request,
    schema: aiIndoorAirRequestSchema,
    rateBucketPrefix: "ai-indoor",
    defaultErrorMessage: "Gemini indoor air coach unavailable.",
    execute: async ({ data, context, signal }) => ({
      result: await runGeminiIndoorCoach({
        context,
        roomFocus: data.roomFocus,
        cookingStyle: data.cookingStyle,
        budgetTier: data.budgetTier ?? context.nonSensitiveProfileSummary.budgetTier,
        hasPurifier:
          data.hasPurifier ?? context.nonSensitiveProfileSummary.hasHepaPurifier,
        indoorSmokeNote: data.indoorSmokeNote,
        locale: data.locale,
        signal,
      }),
      fallbackData: buildDeterministicIndoorFallback(context),
    }),
  });
}
