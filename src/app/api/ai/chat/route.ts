import type { NextRequest } from "next/server";
import { buildDeterministicChatFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteError,
  formatAiRouteSuccess,
  parseAndValidateAiRequest,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { aiChatRequestSchema } from "@/lib/ai/schemas";
import { runGeminiChat } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidateAiRequest(
    request,
    aiChatRequestSchema,
    "ai-chat"
  );
  if (!parsed.ok) return parsed.response;

  const { message, history, locale, location, profile } = parsed.data;
  const { context } = await resolveServerAiContext({
    location,
    profile,
    locale,
    signal: request.signal,
  });

  const result = await runGeminiChat({
    context,
    message,
    history,
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
    message: result.message ?? "Gemini chat unavailable.",
    fallbackData: buildDeterministicChatFallback(context, locale),
    context,
  });
}
