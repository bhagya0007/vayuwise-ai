"use client";

import Link from "next/link";
import {
  Check,
  CheckSquare,
  Copy,
  FileText,
  Printer,
  Share2,
  ShieldCheck,
  Square,
  Users,
} from "lucide-react";
import {
  AiProvenanceBadge,
  ContextMetaStrip,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProvenanceMode } from "@/hooks/useAiModuleRequest";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiCommunityPlanResponse } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import type { BudgetTier, Locale } from "@/types/domain";

export function CommunityActionPlanResults({
  plan,
  aiGenerated,
  provenanceMode,
  modelUsed,
  citations,
  contextMeta,
  budgetTier,
  approxPopulation,
  availableResources,
  completedChecklist,
  copiedPlan,
  locale,
  onCopyPlan,
  onSharePlan,
  onToggleChecklistItem,
}: {
  plan: AiCommunityPlanResponse;
  aiGenerated: boolean;
  provenanceMode?: ProvenanceMode;
  modelUsed?: string;
  citations: VerifiedKnowledgeSource[];
  contextMeta: AiContextMeta | null;
  budgetTier: BudgetTier;
  approxPopulation: number;
  availableResources: string;
  completedChecklist: string[];
  copiedPlan: boolean;
  locale: Locale;
  onCopyPlan: () => void;
  onSharePlan: () => void;
  onToggleChecklistItem: (item: string) => void;
}) {
  const isHi = locale === "hi";
  const timelineCards = [
    { title: isHi ? "आज" : "Today", items: plan.immediateActions },
    { title: isHi ? "इस सप्ताह" : "This Week", items: plan.weeklyActions },
    { title: isHi ? "इस महीने" : "This Month", items: plan.longTermActions },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AiProvenanceBadge
            aiGenerated={aiGenerated}
            provenanceMode={provenanceMode}
            modelUsed={modelUsed}
          />
          <div className="flex flex-wrap items-center gap-1.5 print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopyPlan}
              className="gap-1.5 text-xs"
            >
              {copiedPlan ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{isHi ? "कॉपी करें" : "Copy"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSharePlan}
              className="gap-1.5 text-xs"
            >
              <Share2 className="size-3.5" />
              <span>{isHi ? "शेयर करें" : "Share"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Printer className="size-3.5" />
              <span>{isHi ? "प्रिंट" : "Print"}</span>
            </Button>
            <Link
              href="/report"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "gap-1.5 text-xs"
              )}
            >
              <FileText className="size-3.5" />
              <span>{isHi ? "पूर्ण रिपोर्ट" : "Full Report"}</span>
            </Link>
          </div>
        </div>

        <h2 className="text-lg font-semibold">{plan.headline}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {isHi ? "लागत श्रेणी:" : "Cost Tier:"} {budgetTier.replace("_", " ")}
          </Badge>
          <Badge variant="outline">
            {isHi ? "समुदाय आकार:" : "Community Size:"} ~{approxPopulation}
          </Badge>
          {availableResources.trim() ? (
            <Badge variant="outline">
              {isHi ? "संसाधन:" : "Resources:"} {availableResources.trim()}
            </Badge>
          ) : null}
        </div>
        {contextMeta ? <ContextMetaStrip meta={contextMeta} /> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {timelineCards.map((section) => (
          <Card key={section.title} size="sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground sm:text-sm">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <details className="rounded-2xl border border-border bg-card p-4 text-xs">
        <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
          {isHi
            ? `जिम्मेदारियाँ, चेकलिस्ट (${completedChecklist.length}/${plan.implementationChecklist.length}) और स्वास्थ्य नोट्स`
            : `Checklist (${completedChecklist.length}/${plan.implementationChecklist.length}), roles & safety notes`}
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Users className="size-4 text-primary" aria-hidden="true" />
                {isHi ? "जिम्मेदार श्रेणियाँ:" : "Stakeholders:"}{" "}
                <span className="font-normal text-muted-foreground">
                  {plan.responsibilityCategories.join(" · ")}
                </span>
              </p>
              <div className="space-y-1.5">
                {plan.implementationChecklist.map((c) => {
                  const checked = completedChecklist.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => onToggleChecklistItem(c)}
                      className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${
                        checked
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      ) : (
                        <Square className="mt-0.5 size-3.5 shrink-0" />
                      )}
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                {isHi ? "अपेक्षित परिणाम व स्वास्थ्य सुरक्षा" : "Outcomes & Health Safety"}
              </p>
              <ul className="space-y-1">
                {plan.expectedQualitativeOutcomes.map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                {plan.healthAndSafetyNotes.map((n) => (
                  <p key={n}>• {n}</p>
                ))}
              </div>
            </div>
          </div>

          <WhyRecommendationToggle
            explanation={plan.whyThisRecommendation}
            contextMeta={contextMeta ?? undefined}
            dataBasis={plan.dataBasis}
            sourceIds={plan.sourceIds}
            citations={citations}
            limitation={plan.disclaimer}
          />
        </div>
      </details>
    </div>
  );
}
