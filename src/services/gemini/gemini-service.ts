import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getServerEnv, isGeminiConfigured } from "@/config/env";
import {
  buildChatUserPrompt,
  buildCommunityPlanPrompt,
  buildDailyPlanPrompt,
  buildImpactExplainPrompt,
  buildIndoorCoachPrompt,
  buildSustainabilityPrompt,
  getVayuSystemInstruction,
} from "@/lib/ai/prompts";
import {
  applyChatSafetyPolicy,
  applyCommunitySafetyPolicy,
  applyDailyPlanSafetyPolicy,
  applyImpactExplainSafetyPolicy,
  applyIndoorSafetyPolicy,
  applySustainabilitySafetyPolicy,
  type SafetyValidationReport,
} from "@/lib/ai/safety";
import {
  aiChatResponseSchema,
  aiCommunityPlanResponseSchema,
  aiDailyPlanResponseSchema,
  aiImpactExplainResponseSchema,
  aiIndoorAirResponseSchema,
  aiSustainabilityResponseSchema,
  type AiChatResponse,
  type AiCommunityPlanResponse,
  type AiDailyPlanResponse,
  type AiImpactExplainResponse,
  type AiIndoorAirResponse,
  type AiSustainabilityResponse,
} from "@/lib/ai/schemas";
import type { GeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import { dedupeInflight } from "@/lib/cache/memory-cache";
import type { Locale, TransportComparisonResult } from "@/types/domain";

export type AiErrorCode =
  | "UNCONFIGURED"
  | "AI_DISABLED"
  | "INVALID_API_KEY"
  | "QUOTA_EXCEEDED"
  | "MODEL_UNAVAILABLE"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "VALIDATION_ERROR"
  | "UPSTREAM_ERROR";

export interface AiUsageInfo {
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
}

export interface GeminiExecutionResult<T> {
  ok: boolean;
  data: T | null;
  aiGenerated: boolean;
  modelUsed?: string;
  latencyMs: number;
  usage?: AiUsageInfo;
  safety?: SafetyValidationReport;
  errorCode?: AiErrorCode;
  message?: string;
}

const GEMINI_TIMEOUT_MS = 18_000;
const MAX_CONCURRENT_GEMINI_CALLS = 4;
let activeGeminiCalls = 0;

function redactSecrets(message: string): string {
  let sanitized = message;
  const configuredKey = process.env.GEMINI_API_KEY?.trim();
  if (configuredKey && configuredKey.length >= 8) {
    sanitized = sanitized.split(configuredKey).join("[REDACTED_KEY]");
  }
  return sanitized
    .replace(/AIza[0-9A-Za-z_-]{15,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[REDACTED_KEY]")
    .replace(/(x-goog-api-key["':\s=]+)[A-Za-z0-9._-]{8,}/gi, "$1[REDACTED_KEY]");
}

function classifyGeminiError(err: unknown): {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
} {
  const rawMsg = redactSecrets(
    err instanceof Error ? err.message : String(err ?? "Unknown Gemini error")
  );
  const lower = rawMsg.toLowerCase();

  if (err instanceof Error && err.name === "AbortError") {
    return {
      code: "TIMEOUT",
      message: "Gemini request timed out. Please retry.",
      retryable: false,
    };
  }

  if (
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return {
      code: "INVALID_API_KEY",
      message:
        "Gemini API credentials were rejected. Please verify GEMINI_API_KEY in server configuration.",
      retryable: false,
    };
  }

  if (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("429")
  ) {
    return {
      code: "QUOTA_EXCEEDED",
      message:
        "Gemini API rate limit or quota reached. Please wait briefly before trying again.",
      retryable: false,
    };
  }

  if (
    lower.includes("not found") ||
    lower.includes("404") ||
    (lower.includes("model") && lower.includes("not supported"))
  ) {
    return {
      code: "MODEL_UNAVAILABLE",
      message:
        "The configured Gemini model is unavailable for this API key/project. Consider switching GEMINI_MODEL (e.g. gemini-3.1-flash-lite or gemini-3.5-flash-lite).",
      retryable: false,
    };
  }

  return {
    code: "UPSTREAM_ERROR",
    message: "Gemini service is temporarily unavailable.",
    retryable: true,
  };
}

const DEFAULT_FLASH_FALLBACKS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
] as const;

export async function generateStructuredWithGemini<T>(params: {
  schema: z.ZodType<T>;
  systemInstruction: string;
  userPrompt: string;
  maxOutputTokens?: number;
  dedupeKey?: string;
  signal?: AbortSignal;
  clientFactory?: (apiKey: string) => GoogleGenAI;
  fallbackModels?: string[];
}): Promise<GeminiExecutionResult<T>> {
  const startedAt = Date.now();
  const env = getServerEnv();

  if (!env.GEMINI_AI_ENABLED) {
    return {
      ok: false,
      data: null,
      aiGenerated: false,
      latencyMs: Date.now() - startedAt,
      errorCode: "AI_DISABLED",
      message: "AI features are currently disabled by server configuration.",
    };
  }

  if (!isGeminiConfigured() || !env.GEMINI_API_KEY) {
    return {
      ok: false,
      data: null,
      aiGenerated: false,
      latencyMs: Date.now() - startedAt,
      errorCode: "UNCONFIGURED",
      message:
        "GEMINI_API_KEY is not configured on the server. Add a valid key in .env.local to enable genuine Gemini AI.",
    };
  }

  if (activeGeminiCalls >= MAX_CONCURRENT_GEMINI_CALLS) {
    return {
      ok: false,
      data: null,
      aiGenerated: false,
      latencyMs: Date.now() - startedAt,
      errorCode: "RATE_LIMITED",
      message: "Server AI concurrency limit reached. Please retry in a moment.",
    };
  }

  const execute = async (): Promise<GeminiExecutionResult<T>> => {
    activeGeminiCalls += 1;
    const ai = params.clientFactory
      ? params.clientFactory(env.GEMINI_API_KEY as string)
      : new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const jsonSchema = z.toJSONSchema(params.schema);
    const candidateModels = Array.from(
      new Set([
        env.GEMINI_MODEL,
        ...(params.fallbackModels ??
          (params.clientFactory ? [] : DEFAULT_FLASH_FALLBACKS)),
      ])
    );
    let lastValidationError: string | null = null;
    let modelIndex = 0;

    try {
      for (let attempt = 0; attempt < Math.max(2, candidateModels.length); attempt++) {
        const activeModel = candidateModels[modelIndex] ?? env.GEMINI_MODEL;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
        const onExternalAbort = () => controller.abort();

        if (params.signal) {
          if (params.signal.aborted) {
            clearTimeout(timer);
            return {
              ok: false,
              data: null,
              aiGenerated: false,
              latencyMs: Date.now() - startedAt,
              errorCode: "TIMEOUT",
              message: "Request cancelled.",
            };
          }
          params.signal.addEventListener("abort", onExternalAbort, { once: true });
        }

        const promptText =
          lastValidationError === null
            ? params.userPrompt
            : `${params.userPrompt}\n\nCORRECTIVE RETRY: Your previous JSON failed schema validation (${lastValidationError}). Return strictly valid JSON matching the schema.`;

        try {
          const response = await ai.models.generateContent({
            model: activeModel,
            contents: promptText,
            config: {
              systemInstruction: params.systemInstruction,
              responseMimeType: "application/json",
              responseJsonSchema: jsonSchema,
              temperature: 0.25,
              maxOutputTokens: params.maxOutputTokens ?? 1600,
              abortSignal: controller.signal,
            },
          });

          const rawText = response.text?.trim() ?? "";
          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(rawText);
          } catch {
            lastValidationError = "Response was not valid JSON.";
            continue;
          }

          const validated = params.schema.safeParse(parsedJson);
          if (!validated.success) {
            lastValidationError =
              validated.error.issues[0]?.message ?? "Schema mismatch";
            continue;
          }

          return {
            ok: true,
            data: validated.data,
            aiGenerated: true,
            modelUsed: activeModel,
            latencyMs: Date.now() - startedAt,
            usage: response.usageMetadata
              ? {
                  promptTokens: response.usageMetadata.promptTokenCount,
                  candidatesTokens: response.usageMetadata.candidatesTokenCount,
                  totalTokens: response.usageMetadata.totalTokenCount,
                }
              : undefined,
          };
        } catch (err) {
          const classified = classifyGeminiError(err);
          const canSwitchModel =
            (classified.code === "UPSTREAM_ERROR" ||
              classified.code === "MODEL_UNAVAILABLE" ||
              classified.code === "TIMEOUT") &&
            modelIndex + 1 < candidateModels.length;

          if (canSwitchModel) {
            modelIndex += 1;
            continue;
          }

          if (!classified.retryable || attempt >= Math.max(2, candidateModels.length) - 1) {
            return {
              ok: false,
              data: null,
              aiGenerated: false,
              modelUsed: activeModel,
              latencyMs: Date.now() - startedAt,
              errorCode: classified.code,
              message: classified.message,
            };
          }
        } finally {
          clearTimeout(timer);
          if (params.signal) {
            params.signal.removeEventListener("abort", onExternalAbort);
          }
        }
      }

      return {
        ok: false,
        data: null,
        aiGenerated: false,
        modelUsed: env.GEMINI_MODEL,
        latencyMs: Date.now() - startedAt,
        errorCode: "VALIDATION_ERROR",
        message:
          "Gemini output could not be validated against the required safety schema.",
      };
    } finally {
      activeGeminiCalls = Math.max(0, activeGeminiCalls - 1);
    }
  };

  if (params.dedupeKey) {
    return dedupeInflight(params.dedupeKey, execute);
  }
  return execute();
}

export async function runGeminiChat(params: {
  context: GeminiAirQualityContext;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  locale: Locale;
  signal?: AbortSignal;
}): Promise<GeminiExecutionResult<AiChatResponse>> {
  const result = await generateStructuredWithGemini({
    schema: aiChatResponseSchema,
    systemInstruction: getVayuSystemInstruction(params.locale),
    userPrompt: buildChatUserPrompt({
      context: params.context,
      message: params.message,
      history: params.history,
    }),
    maxOutputTokens: 1400,
    signal: params.signal,
  });

  if (!result.ok || !result.data) return result;
  const checked = applyChatSafetyPolicy(
    result.data,
    params.context,
    params.message,
    params.locale
  );
  return { ...result, data: checked.data, safety: checked.report };
}

export async function runGeminiDailyPlan(params: {
  context: GeminiAirQualityContext;
  scheduleNote?: string;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<GeminiExecutionResult<AiDailyPlanResponse>> {
  const result = await generateStructuredWithGemini({
    schema: aiDailyPlanResponseSchema,
    systemInstruction: getVayuSystemInstruction(params.locale),
    userPrompt: buildDailyPlanPrompt({
      context: params.context,
      scheduleNote: params.scheduleNote,
    }),
    maxOutputTokens: 2800,
    signal: params.signal,
  });

  if (!result.ok || !result.data) return result;
  const checked = applyDailyPlanSafetyPolicy(
    result.data,
    params.context,
    params.locale
  );
  return { ...result, data: checked.data, safety: checked.report };
}

export async function runGeminiIndoorCoach(params: {
  context: GeminiAirQualityContext;
  roomFocus: string;
  cookingStyle: string;
  budgetTier: string;
  hasPurifier: boolean;
  indoorSmokeNote?: string;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<GeminiExecutionResult<AiIndoorAirResponse>> {
  const result = await generateStructuredWithGemini({
    schema: aiIndoorAirResponseSchema,
    systemInstruction: getVayuSystemInstruction(params.locale),
    userPrompt: buildIndoorCoachPrompt(params),
    maxOutputTokens: 2400,
    signal: params.signal,
  });

  if (!result.ok || !result.data) return result;
  const checked = applyIndoorSafetyPolicy(
    result.data,
    params.context,
    params.locale
  );
  return { ...result, data: checked.data, safety: checked.report };
}

export async function runGeminiSustainability(params: {
  context: GeminiAirQualityContext;
  focusArea: string;
  budgetTier: string;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<GeminiExecutionResult<AiSustainabilityResponse>> {
  const result = await generateStructuredWithGemini({
    schema: aiSustainabilityResponseSchema,
    systemInstruction: getVayuSystemInstruction(params.locale),
    userPrompt: buildSustainabilityPrompt(params),
    maxOutputTokens: 2400,
    signal: params.signal,
  });

  if (!result.ok || !result.data) return result;
  const checked = applySustainabilitySafetyPolicy(
    result.data,
    params.context,
    params.locale
  );
  return { ...result, data: checked.data, safety: checked.report };
}

export async function runGeminiCommunityPlan(params: {
  context: GeminiAirQualityContext;
  communityType: string;
  approxPopulation: number;
  budgetTier: string;
  timeframe: string;
  availableResources?: string;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<GeminiExecutionResult<AiCommunityPlanResponse>> {
  const result = await generateStructuredWithGemini({
    schema: aiCommunityPlanResponseSchema,
    systemInstruction: getVayuSystemInstruction(params.locale),
    userPrompt: buildCommunityPlanPrompt(params),
    maxOutputTokens: 2400,
    signal: params.signal,
  });

  if (!result.ok || !result.data) return result;
  const checked = applyCommunitySafetyPolicy(result.data, params.context);
  return { ...result, data: checked.data, safety: checked.report };
}

export async function runGeminiImpactExplanation(params: {
  context: GeminiAirQualityContext;
  comparison: TransportComparisonResult;
  exposureNote?: string;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<GeminiExecutionResult<AiImpactExplainResponse>> {
  const result = await generateStructuredWithGemini({
    schema: aiImpactExplainResponseSchema,
    systemInstruction: getVayuSystemInstruction(params.locale),
    userPrompt: buildImpactExplainPrompt({
      context: params.context,
      comparison: params.comparison,
      exposureNote: params.exposureNote,
    }),
    maxOutputTokens: 1200,
    signal: params.signal,
  });

  if (!result.ok || !result.data) return result;
  const checked = applyImpactExplainSafetyPolicy(
    result.data,
    params.context,
    params.comparison,
    params.locale
  );
  return { ...result, data: checked.data, safety: checked.report };
}
