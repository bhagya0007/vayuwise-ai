import type { NextRequest } from "next/server";
import { buildDeterministicSustainabilityFallback } from "@/lib/ai/fallbacks";
import { handleAiPostRequest } from "@/lib/ai/route-helper";
import { aiSustainabilityRequestSchema } from "@/lib/ai/schemas";
import { runGeminiSustainability } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleAiPostRequest({
    request,
    schema: aiSustainabilityRequestSchema,
    rateBucketPrefix: "ai-sustainability",
    defaultErrorMessage: "Gemini sustainability advisor unavailable.",
    execute: async ({ data, context, signal }) => ({
      result: await runGeminiSustainability({
        context,
        focusArea: data.focusArea,
        budgetTier: data.budgetTier ?? context.nonSensitiveProfileSummary.budgetTier,
        locale: data.locale,
        signal,
      }),
      fallbackData: buildDeterministicSustainabilityFallback(context),
    }),
  });
}
