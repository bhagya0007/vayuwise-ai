"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiContextMeta } from "@/components/ai/AiTransparencyWidgets";
import {
  postAiEndpoint,
  type AiModuleErrorState,
} from "@/lib/ai/client";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";

export type ProvenanceMode =
  | "gemini"
  | "gemini_safety_adjusted"
  | "rule_based_fallback";

interface UseAiModuleRequestOptions {
  endpoint: string;
  locationKey: string;
  fallbackErrorMessage: string;
  networkErrorMessage: string;
  successToastMessage: string;
  recommendationFingerprint: string;
  addToast: (msg: string, variant?: "success" | "info") => void;
}

/**
 * Shared client lifecycle hook for AI recommendation modules (`Planner`, `IndoorAir`,
 * `Sustainability`, `Community`, and `Impact` explanations).
 * Automatically aborts in-flight requests on unmount or location switches to prevent stale updates.
 */
export function useAiModuleRequest<TData>({
  endpoint,
  locationKey,
  fallbackErrorMessage,
  networkErrorMessage,
  successToastMessage,
  recommendationFingerprint,
  addToast,
}: UseAiModuleRequestOptions) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TData | null>(null);
  const [generatedFingerprint, setGeneratedFingerprint] = useState<string | null>(
    null
  );
  const [aiGenerated, setAiGenerated] = useState(false);
  const [provenanceMode, setProvenanceMode] = useState<
    ProvenanceMode | undefined
  >(undefined);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [citations, setCitations] = useState<VerifiedKnowledgeSource[]>([]);
  const [contextMeta, setContextMeta] = useState<AiContextMeta | null>(null);
  const [errorState, setErrorState] =
    useState<AiModuleErrorState<TData> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Cancel stale in-flight requests if user switches active city
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [locationKey]);

  const execute = useCallback(
    async (
      body: unknown,
      onSuccess?: (resultData: TData) => void
    ): Promise<boolean> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setErrorState(null);

      const res = await postAiEndpoint<TData>({
        endpoint,
        body,
        fallbackErrorMessage,
        networkErrorMessage,
        signal: controller.signal,
      });

      if (res.aborted || controller.signal.aborted) {
        return false;
      }

      if (!res.ok || !res.payload) {
        setErrorState(res.error ?? { message: fallbackErrorMessage });
        setLoading(false);
        return false;
      }

      const { payload } = res;
      setData(payload.data);
      setGeneratedFingerprint(recommendationFingerprint);
      setAiGenerated(payload.aiGenerated);
      setProvenanceMode(payload.provenanceMode);
      setModelUsed(payload.modelUsed);
      setCitations(payload.citations);
      setContextMeta(payload.contextMeta);
      onSuccess?.(payload.data);
      addToast(successToastMessage);
      setLoading(false);
      return true;
    },
    [
      endpoint,
      fallbackErrorMessage,
      networkErrorMessage,
      recommendationFingerprint,
      successToastMessage,
      addToast,
    ]
  );

  const applyFallback = useCallback(() => {
    if (!errorState?.fallback) return;
    setData(errorState.fallback);
    setGeneratedFingerprint(recommendationFingerprint);
    setAiGenerated(false);
    setProvenanceMode("rule_based_fallback");
    setModelUsed(undefined);
    setCitations([]);
    setContextMeta(errorState.contextMeta ?? null);
    setErrorState(null);
  }, [errorState, recommendationFingerprint]);

  const resetResult = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setData(null);
    setErrorState(null);
  }, []);

  return {
    loading,
    data,
    generatedFingerprint,
    aiGenerated,
    provenanceMode,
    modelUsed,
    citations,
    contextMeta,
    errorState,
    setData,
    execute,
    applyFallback,
    resetResult,
  };
}
