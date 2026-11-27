import type { NextRequest } from "next/server";
import { buildDeterministicChatFallback } from "@/lib/ai/fallbacks";
import { handleAiPostRequest } from "@/lib/ai/route-helper";
import { aiChatRequestSchema } from "@/lib/ai/schemas";
import { runGeminiChat } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleAiPostRequest({
    request,
    schema: aiChatRequestSchema,
    rateBucketPrefix: "ai-chat",
    defaultErrorMessage: "Gemini chat unavailable.",
    execute: async ({ data, context, signal }) => ({
      result: await runGeminiChat({
        context,
        message: data.message,
        history: data.history,
        locale: data.locale,
        signal,
      }),
      fallbackData: buildDeterministicChatFallback(context, data.locale),
    }),
  });
}
