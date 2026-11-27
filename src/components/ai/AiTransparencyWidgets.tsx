"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  resolveVerifiedCitations,
  type VerifiedKnowledgeSource,
} from "@/lib/ai/knowledge-registry";

export interface AiContextMeta {
  locationName: string;
  timezone: string;
  usAqi: number | null;
  severityLabel: string;
  dataSourceType: string;
  aqiStandard: string;
  modelTimestampIso?: string;
  freshnessStatus?: string;
  isStale?: boolean;
}

export function AiProvenanceBadge({
  aiGenerated,
  modelUsed,
  provenanceMode,
}: {
  aiGenerated: boolean;
  modelUsed?: string;
  provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
}) {
  const resolvedMode =
    provenanceMode ?? (aiGenerated ? "gemini" : "rule_based_fallback");

  if (resolvedMode === "gemini_safety_adjusted") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-sky-500/40 bg-sky-500/12 text-sky-800 dark:text-sky-200"
      >
        <ShieldCheck className="size-3" aria-hidden="true" />
        <span>
          Gemini AI{modelUsed ? ` · ${modelUsed}` : ""} (Safety Adjusted)
        </span>
      </Badge>
    );
  }

  if (resolvedMode === "gemini") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      >
        <Sparkles className="size-3" aria-hidden="true" />
        <span>Gemini AI{modelUsed ? ` · ${modelUsed}` : ""}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-200"
    >
      <ShieldCheck className="size-3" aria-hidden="true" />
      <span>Rule-Based Fallback (Not Gemini AI)</span>
    </Badge>
  );
}

export function ContextMetaStrip({ meta }: { meta: AiContextMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/35 px-3.5 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{meta.locationName}</span>
      <span>·</span>
      <span>
        {meta.usAqi !== null
          ? `US AQI ${Math.round(meta.usAqi)} (${meta.severityLabel})`
          : "US AQI Unavailable"}
      </span>
      <span>·</span>
      <span className="capitalize">Source: {meta.dataSourceType}</span>
      {meta.isStale ? (
        <Badge variant="outline" className="border-amber-500/40 text-[10px]">
          Stale / Demo Context
        </Badge>
      ) : null}
    </div>
  );
}

export function AiDisclosureNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card/70 px-3.5 py-2.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <p>
        Queries and non-PII context are processed via server-side Google Gemini API and are not saved in a VayuWise database. Under Google Gemini free-tier terms, submitted prompts/outputs may be reviewed or logged by Google; do not enter medical records, personal identities, or confidential details.
      </p>
    </div>
  );
}

export function WhyRecommendationToggle({
  explanation,
  dataBasis,
  personalizationBasis,
  sourceIds,
  citations,
  limitation,
}: {
  explanation: string;
  dataBasis?: string;
  personalizationBasis?: string;
  sourceIds?: string[];
  citations?: VerifiedKnowledgeSource[];
  limitation?: string;
}) {
  const [open, setOpen] = useState(false);
  const resolved = citations ?? resolveVerifiedCitations(sourceIds);

  return (
    <div className="rounded-xl border border-border/80 bg-muted/25">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/45 rounded-xl transition-colors"
      >
        <span>Why this recommendation?</span>
        {open ? (
          <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/70 px-3 py-2.5 text-xs text-muted-foreground">
          <p className="leading-relaxed text-foreground/90">{explanation}</p>
          {dataBasis ? (
            <p>
              <span className="font-medium text-foreground">Data basis:</span>{" "}
              {dataBasis}
            </p>
          ) : null}
          {personalizationBasis ? (
            <p>
              <span className="font-medium text-foreground">Profile basis:</span>{" "}
              {personalizationBasis}
            </p>
          ) : null}
          {limitation ? (
            <p>
              <span className="font-medium text-foreground">Limitation:</span>{" "}
              {limitation}
            </p>
          ) : null}
          {resolved.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {resolved.map((src) => (
                <a
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-primary hover:underline"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="size-2.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AiErrorRecoveryCard({
  message,
  errorCode,
  onRetry,
  onUseFallback,
  hasFallback,
}: {
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  onUseFallback?: () => void;
  hasFallback: boolean;
}) {
  return (
    <Card className="border-amber-500/40 bg-amber-500/8">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="font-semibold text-foreground">
              Gemini AI Unavailable{errorCode ? ` (${errorCode})` : ""}
            </p>
            <p className="text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry Gemini Request
            </Button>
          ) : null}
          {hasFallback && onUseFallback ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onUseFallback}
            >
              Show Deterministic Rule-Based Guidance (Not AI)
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
