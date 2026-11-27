"use client";

import { Bot, Check, Copy, RotateCcw, User } from "lucide-react";
import {
  AiProvenanceBadge,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { Button } from "@/components/ui/button";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiChatResponse } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  promptUsed?: string;
  aiGenerated?: boolean;
  provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
  modelUsed?: string;
  structured?: AiChatResponse;
  citations?: VerifiedKnowledgeSource[];
  contextMeta?: AiContextMeta;
}

interface AssistantMessageBubbleProps {
  msg: ChatEntry;
  isLatestAssistant: boolean;
  isLoading: boolean;
  copiedId: string | null;
  onRegenerate: () => void;
  onCopy: (msg: ChatEntry) => void;
}

/**
 * Renders a single user or Vayu AI assistant turn with provenance labeling,
 * structured action cards, safety cautions, and expandable source attribution.
 */
export function AssistantMessageBubble({
  msg,
  isLatestAssistant,
  isLoading,
  copiedId,
  onRegenerate,
  onCopy,
}: AssistantMessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        msg.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {msg.role === "assistant" ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bot className="size-4" aria-hidden="true" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[92%] space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[82%]",
          msg.role === "user"
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-muted/35 text-foreground"
        )}
      >
        {msg.role === "assistant" ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AiProvenanceBadge
              aiGenerated={Boolean(msg.aiGenerated)}
              provenanceMode={msg.provenanceMode}
              modelUsed={msg.modelUsed}
            />
            <div className="flex items-center gap-1">
              {isLatestAssistant ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isLoading}
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onCopy(msg)}
                aria-label="Copy response"
              >
                {copiedId === msg.id ? (
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        ) : null}

        <p className="whitespace-pre-line">{msg.text}</p>

        {msg.structured?.recommendations &&
        msg.structured.recommendations.length > 0 ? (
          <div className="space-y-1.5">
            {msg.structured.recommendations.slice(0, 5).map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-semibold text-foreground">{rec.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {rec.suggestedTiming} · {rec.relativeCost.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 text-foreground/90">{rec.suggestedAction}</p>
              </div>
            ))}
          </div>
        ) : null}

        {msg.structured?.cautions && msg.structured.cautions.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
            {msg.structured.cautions.map((c) => (
              <p key={c}>• {c}</p>
            ))}
          </div>
        ) : null}

        {msg.structured ? (
          <WhyRecommendationToggle
            explanation={msg.structured.whyThisRecommendation}
            contextMeta={msg.contextMeta}
            dataBasis={msg.structured.dataBasis}
            sourceIds={msg.structured.sourceIds}
            citations={msg.citations}
            limitation={msg.structured.disclaimer}
          />
        ) : null}
      </div>

      {msg.role === "user" ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <User className="size-4" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
