import type { NextRequest } from "next/server";
import { buildDeterministicImpactFallback } from "@/lib/ai/fallbacks";
import {
  formatAiRouteError,
  formatAiRouteSuccess,
  parseAndValidateAiRequest,
  resolveServerAiContext,
} from "@/lib/ai/route-helper";
import { aiImpactExplainRequestSchema } from "@/lib/ai/schemas";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { runGeminiImpactExplanation } from "@/services/gemini/gemini-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidateAiRequest(
    request,
    aiImpactExplainRequestSchema,
    "ai-impact"
  );
  if (!parsed.ok) return parsed.response;

  const { locale, location, profile, baseline, alternative, exposureNote } =
    parsed.data;

  // Deterministic math ALWAYS runs on the server from raw parameters — never trusting client totals.
  let comparison;
  try {
    comparison = compareTransportScenarios({ baseline, alternative });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorCode: "INVALID_CALCULATION_INPUT",
        message:
          err instanceof Error
            ? err.message
            : "Invalid transport impact calculation inputs.",
      },
      { status: 400 }
    );
  }

  const { context } = await resolveServerAiContext({
    location,
    profile,
    locale,
    signal: request.signal,
  });

  const result = await runGeminiImpactExplanation({
    context,
    comparison,
    exposureNote,
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
    message: result.message ?? "Gemini impact explanation unavailable.",
    fallbackData: buildDeterministicImpactFallback(
      context,
      comparison,
      locale
    ),
    context,
    extra: { deterministicComparison: comparison },
  });
}
