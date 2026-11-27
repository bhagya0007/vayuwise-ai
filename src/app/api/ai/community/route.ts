import type { NextRequest } from "next/server";
import { buildDeterministicCommunityFallback } from "@/lib/ai/fallbacks";
import { handleAiPostRequest } from "@/lib/ai/route-helper";
import { aiCommunityPlanRequestSchema } from "@/lib/ai/schemas";
import { runGeminiCommunityPlan } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleAiPostRequest({
    request,
    schema: aiCommunityPlanRequestSchema,
    rateBucketPrefix: "ai-community",
    defaultErrorMessage: "Gemini community planner unavailable.",
    execute: async ({ data, context, signal }) => ({
      result: await runGeminiCommunityPlan({
        context,
        communityType: data.communityType,
        approxPopulation: data.approxPopulation,
        budgetTier: data.budgetTier,
        timeframe: data.timeframe,
        availableResources: data.availableResources,
        locale: data.locale,
        signal,
      }),
      fallbackData: buildDeterministicCommunityFallback(context, data.communityType),
    }),
  });
}
