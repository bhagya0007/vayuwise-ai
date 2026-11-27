"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import {
  AiErrorRecoveryCard,
  AiProvenanceBadge,
  ContextMetaStrip,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiImpactExplainResponse } from "@/lib/ai/schemas";
import type { Locale } from "@/types/domain";

export interface ImpactAiExplainState {
  signature: string;
  data: AiImpactExplainResponse;
  aiGenerated: boolean;
  provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
  modelUsed?: string;
  citations: VerifiedKnowledgeSource[];
  contextMeta?: AiContextMeta;
}

interface ImpactAiExplanationCardProps {
  title: string;
  buttonLabel: string;
  locale: Locale;
  aiLoading: boolean;
  disabled: boolean;
  aiError: {
    message: string;
    errorCode?: string;
    fallback?: AiImpactExplainResponse;
    contextMeta?: AiContextMeta;
  } | null;
  activeAiExplanation: ImpactAiExplainState | null;
  onExplain: () => void;
  onUseFallback: () => void;
}

/**
 * Interprets verified deterministic commute comparison figures alongside local AQI via Gemini AI.
 */
export function ImpactAiExplanationCard({
  title,
  buttonLabel,
  locale,
  aiLoading,
  disabled,
  aiError,
  activeAiExplanation,
  onExplain,
  onUseFallback,
}: ImpactAiExplanationCardProps) {
  return (
    <Card className="border-primary/25">
      <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>
            {locale === "hi"
              ? "Gemini केवल सत्यापित गणना परिणामों की व्याख्या करता है — कोई नया संख्यात्मक अनुमान नहीं जोड़ता।"
              : "Gemini interprets your verified deterministic numbers alongside current city AQI without altering or fabricating figures."}
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={onExplain}
          disabled={aiLoading || disabled}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw
            className={`size-4 ${aiLoading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{buttonLabel}</span>
        </Button>
      </CardHeader>

      {aiError ? (
        <CardContent>
          <AiErrorRecoveryCard
            message={aiError.message}
            errorCode={aiError.errorCode}
            onRetry={onExplain}
            hasFallback={Boolean(aiError.fallback)}
            onUseFallback={aiError.fallback ? onUseFallback : undefined}
          />
        </CardContent>
      ) : activeAiExplanation ? (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AiProvenanceBadge
              aiGenerated={activeAiExplanation.aiGenerated}
              provenanceMode={activeAiExplanation.provenanceMode}
              modelUsed={activeAiExplanation.modelUsed}
            />
            {activeAiExplanation.contextMeta ? (
              <ContextMetaStrip meta={activeAiExplanation.contextMeta} />
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted/25 p-4 text-sm">
            <p className="font-semibold">{activeAiExplanation.data.headline}</p>
            <p className="leading-relaxed text-muted-foreground">
              {activeAiExplanation.data.whatItMeans}
            </p>
            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  {locale === "hi" ? "व्यावहारिक पहलू" : "Practical Trade-Offs"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {activeAiExplanation.data.practicalTradeOffs}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  {locale === "hi"
                    ? "जलवायु बचत बनाम श्वसन सुरक्षा"
                    : "CO₂e Savings vs Ambient Exposure"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {activeAiExplanation.data.exposureVsClimateNote}
                </p>
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-5 pt-2 text-xs text-muted-foreground">
              {activeAiExplanation.data.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <WhyRecommendationToggle
            explanation={activeAiExplanation.data.whyThisRecommendation}
            dataBasis={activeAiExplanation.data.dataBasis}
            sourceIds={activeAiExplanation.data.sourceIds}
            citations={activeAiExplanation.citations}
            limitation={activeAiExplanation.data.disclaimer}
          />
        </CardContent>
      ) : null}
    </Card>
  );
}
