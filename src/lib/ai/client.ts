import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiContextMeta } from "@/components/ai/AiTransparencyWidgets";
import type { GeoLocation } from "@/types/domain";

export interface AiModuleErrorState<TFallback> {
  message: string;
  errorCode?: string;
  fallback?: TFallback;
  contextMeta?: AiContextMeta;
}

export interface AiSuccessPayload<TData> {
  ok: true;
  data: TData;
  aiGenerated: boolean;
  provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
  modelUsed?: string;
  citations: VerifiedKnowledgeSource[];
  contextMeta: AiContextMeta | null;
}

export interface AiEndpointResult<TData> {
  ok: boolean;
  payload?: AiSuccessPayload<TData>;
  error?: AiModuleErrorState<TData>;
  aborted?: boolean;
}

/**
 * Strips non-request metadata from a `GeoLocation` before sending to `/api/ai/*` routes.
 */
export function toAiLocationPayload(loc: GeoLocation) {
  return {
    id: loc.id,
    name: loc.name,
    region: loc.region,
    country: loc.country,
    countryCode: loc.countryCode,
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone,
  };
}

/**
 * Typed client wrapper for POSTing to `/api/ai/*` routes with uniform validation,
 * network error recovery, abort safety, and fallback payload extraction.
 */
export async function postAiEndpoint<TData>(params: {
  endpoint: string;
  body: unknown;
  fallbackErrorMessage: string;
  networkErrorMessage: string;
  signal?: AbortSignal;
}): Promise<AiEndpointResult<TData>> {
  try {
    const res = await fetch(params.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: params.signal,
      body: JSON.stringify(params.body),
    });

    const json = (await res.json()) as {
      ok: boolean;
      data?: TData;
      fallbackData?: TData;
      aiGenerated?: boolean;
      provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
      modelUsed?: string;
      citations?: VerifiedKnowledgeSource[];
      contextMeta?: AiContextMeta;
      errorCode?: string;
      message?: string;
    };

    if (!res.ok || !json.ok || !json.data) {
      return {
        ok: false,
        error: {
          message: json.message ?? params.fallbackErrorMessage,
          errorCode: json.errorCode,
          fallback: json.fallbackData,
          contextMeta: json.contextMeta,
        },
      };
    }

    return {
      ok: true,
      payload: {
        ok: true,
        data: json.data,
        aiGenerated: Boolean(json.aiGenerated),
        provenanceMode: json.provenanceMode,
        modelUsed: json.modelUsed,
        citations: json.citations ?? [],
        contextMeta: json.contextMeta ?? null,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, aborted: true };
    }
    return {
      ok: false,
      error: {
        message: params.networkErrorMessage,
        errorCode: "NETWORK_ERROR",
      },
    };
  }
}
