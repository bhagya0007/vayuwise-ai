"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckSquare,
  Copy,
  FileText,
  Printer,
  RefreshCw,
  Share2,
  ShieldCheck,
  Square,
  Users,
} from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
  AiProvenanceBadge,
  ContextMetaStrip,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { EmptyStateCard } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiCommunityPlanResponse } from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BudgetTier } from "@/types/domain";

export function CommunityView() {
  const {
    selectedLocation,
    locale,
    recommendationFingerprint,
    logActivity,
    addToast,
  } = useAppPreferences();

  const [generatedFingerprint, setGeneratedFingerprint] = useState<string | null>(
    null
  );
  const [communityType, setCommunityType] = useState<
    | "residential_society"
    | "school"
    | "college"
    | "workplace"
    | "neighborhood_group"
  >("residential_society");
  const [approxPopulation, setApproxPopulation] = useState(250);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("low_cost");
  const [timeframe, setTimeframe] = useState<
    "immediate_48h" | "weekly" | "winter_season"
  >("weekly");
  const [availableResources, setAvailableResources] = useState("");
  const [completedChecklist, setCompletedChecklist] = useState<string[]>([]);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AiCommunityPlanResponse | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [provenanceMode, setProvenanceMode] = useState<
    "gemini" | "gemini_safety_adjusted" | "rule_based_fallback" | undefined
  >(undefined);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [citations, setCitations] = useState<VerifiedKnowledgeSource[]>([]);
  const [contextMeta, setContextMeta] = useState<AiContextMeta | null>(null);
  const [errorState, setErrorState] = useState<{
    message: string;
    errorCode?: string;
    fallback?: AiCommunityPlanResponse;
    contextMeta?: AiContextMeta;
  } | null>(null);

  const generateCommunityPlan = async () => {
    setLoading(true);
    setErrorState(null);
    setCompletedChecklist([]);
    try {
      const res = await fetch("/api/ai/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          location: {
            id: selectedLocation.id,
            name: selectedLocation.name,
            region: selectedLocation.region,
            country: selectedLocation.country,
            countryCode: selectedLocation.countryCode,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            timezone: selectedLocation.timezone,
          },
          communityType,
          approxPopulation: Math.max(10, Math.min(50000, approxPopulation)),
          budgetTier,
          timeframe,
          availableResources: availableResources.trim() || undefined,
        }),
      });

      const body = (await res.json()) as {
        ok: boolean;
        data?: AiCommunityPlanResponse;
        fallbackData?: AiCommunityPlanResponse;
        aiGenerated?: boolean;
        provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
        modelUsed?: string;
        citations?: VerifiedKnowledgeSource[];
        contextMeta?: AiContextMeta;
        errorCode?: string;
        message?: string;
      };

      if (!res.ok || !body.ok || !body.data) {
        setErrorState({
          message: body.message ?? "Unable to generate community action plan.",
          errorCode: body.errorCode,
          fallback: body.fallbackData,
          contextMeta: body.contextMeta,
        });
        return;
      }

      setPlan(body.data);
      setGeneratedFingerprint(recommendationFingerprint);
      setAiGenerated(Boolean(body.aiGenerated));
      setProvenanceMode(body.provenanceMode);
      setModelUsed(body.modelUsed);
      setCitations(body.citations ?? []);
      setContextMeta(body.contextMeta ?? null);
      addToast(
        locale === "hi"
          ? "सामुदायिक कार्य योजना तैयार हुई।"
          : "Community action plan generated."
      );
    } catch {
      setErrorState({
        message: "Network error while contacting Community Planner.",
        errorCode: "NETWORK_ERROR",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPlanText = (p: AiCommunityPlanResponse) => {
    return [
      `${p.headline} (${selectedLocation.name})`,
      "",
      "Immediate Smog Response:",
      ...p.immediateActions.map((x) => `- ${x}`),
      "",
      "7-Day Action Plan:",
      ...p.weeklyActions.map((x) => `- ${x}`),
      "",
      "30-Day Improvement Plan:",
      ...p.longTermActions.map((x) => `- ${x}`),
      "",
      `Stakeholders: ${p.responsibilityCategories.join(", ")}`,
      `Health & Safety Notes: ${p.healthAndSafetyNotes.join(" | ")}`,
    ].join("\n");
  };

  const handleCopyPlan = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(formatPlanText(plan));
      setCopiedPlan(true);
      addToast(locale === "hi" ? "योजना कॉपी की गई।" : "Community plan copied.");
      window.setTimeout(() => setCopiedPlan(false), 1800);
    } catch {
      addToast("Clipboard copy unavailable in this browser.", "info");
    }
  };

  const handleSharePlan = async () => {
    if (!plan) return;
    const text = formatPlanText(plan);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: plan.headline,
          text,
        });
        return;
      } catch {
        // user cancelled or unavailable; fall back to copy
      }
    }
    await handleCopyPlan();
  };

  const toggleChecklistItem = (item: string) => {
    const exists = completedChecklist.includes(item);
    setCompletedChecklist((prev) =>
      exists ? prev.filter((x) => x !== item) : [...prev, item]
    );
    if (!exists) {
      logActivity({
        activityType: "community_action",
        title: item.slice(0, 120),
        dedupeKey: `comm:${item.slice(0, 40)}`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {locale === "hi" ? "सामुदायिक योजना" : "Community Action Plan"}
              </h1>
              <CardDescription>
                {locale === "hi"
                  ? `${selectedLocation.name} के स्कूल, सोसायटी या कार्यस्थल के लिए व्यावहारिक योजना।`
                  : `Practical smog readiness plan for societies, schools, or workplaces in ${selectedLocation.name}.`}
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => void generateCommunityPlan()}
              disabled={loading}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>
                {locale === "hi" ? "कार्य योजना बनाएँ" : "Generate Action Plan"}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="comm-type" className="text-xs">
                {locale === "hi" ? "समुदाय प्रकार" : "Community Type"}
              </Label>
              <select
                id="comm-type"
                value={communityType}
                onChange={(e) =>
                  setCommunityType(e.target.value as typeof communityType)
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="residential_society">
                  {locale === "hi" ? "रिहायशी सोसायटी (RWA)" : "Residential Society"}
                </option>
                <option value="school">
                  {locale === "hi" ? "स्कूल" : "School"}
                </option>
                <option value="college">
                  {locale === "hi" ? "कॉलेज / कैंपस" : "College / Campus"}
                </option>
                <option value="workplace">
                  {locale === "hi" ? "कार्यस्थल" : "Workplace"}
                </option>
                <option value="neighborhood_group">
                  {locale === "hi" ? "मोहल्ला समूह" : "Neighborhood Group"}
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="comm-pop" className="text-xs">
                {locale === "hi" ? "अनुमानित सदस्य संख्या" : "Approx. Population"}
              </Label>
              <Input
                id="comm-pop"
                type="number"
                min={10}
                max={50000}
                value={approxPopulation}
                onChange={(e) =>
                  setApproxPopulation(Math.max(10, Number(e.target.value)))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="comm-budget" className="text-xs">
                {locale === "hi" ? "बजट" : "Budget"}
              </Label>
              <select
                id="comm-budget"
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="free">
                  {locale === "hi" ? "शून्य बजट" : "Zero Budget"}
                </option>
                <option value="low_cost">
                  {locale === "hi" ? "कम बजट" : "Low Budget"}
                </option>
                <option value="investment">
                  {locale === "hi" ? "समर्पित बजट" : "Dedicated Budget"}
                </option>
              </select>
            </div>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground/80">
              {locale === "hi" ? "समय-सीमा, संसाधन और AI गोपनीयता" : "Timeframe, resources & AI privacy"}
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="comm-time" className="text-xs">
                    {locale === "hi" ? "समय-सीमा" : "Timeframe"}
                  </Label>
                  <select
                    id="comm-time"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="immediate_48h">
                      {locale === "hi" ? "तत्काल (48 घंटे)" : "Immediate (48h)"}
                    </option>
                    <option value="weekly">
                      {locale === "hi" ? "साप्ताहिक (7-दिन)" : "7-Day Rollout"}
                    </option>
                    <option value="winter_season">
                      {locale === "hi" ? "30-दिवसीय / शीतकालीन" : "30-Day / Winter"}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="comm-resources" className="text-xs">
                    {locale === "hi" ? "उपलब्ध संसाधन" : "Available Resources"}
                  </Label>
                  <Input
                    id="comm-resources"
                    value={availableResources}
                    onChange={(e) => setAvailableResources(e.target.value)}
                    placeholder={
                      locale === "hi"
                        ? "जैसे: नोटिस बोर्ड, सुरक्षा गार्ड"
                        : "e.g. notice board, club room"
                    }
                    maxLength={300}
                  />
                </div>
              </div>
              <PersonalizationStatusStrip generatedFingerprint={generatedFingerprint} />
              <AiDisclosureNote />
            </div>
          </details>
        </CardContent>
      </Card>

      {errorState ? (
        <AiErrorRecoveryCard
          message={errorState.message}
          errorCode={errorState.errorCode}
          onRetry={() => void generateCommunityPlan()}
          hasFallback={Boolean(errorState.fallback)}
          onUseFallback={() => {
            if (!errorState.fallback) return;
            setPlan(errorState.fallback);
            setAiGenerated(false);
            setModelUsed(undefined);
            setContextMeta(errorState.contextMeta ?? null);
            setErrorState(null);
          }}
        />
      ) : null}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : plan ? (
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AiProvenanceBadge
                aiGenerated={aiGenerated}
                provenanceMode={provenanceMode}
                modelUsed={modelUsed}
              />
              <div className="print:hidden flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyPlan()}
                  className="gap-1.5 text-xs"
                >
                  {copiedPlan ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>{locale === "hi" ? "कॉपी करें" : "Copy"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSharePlan()}
                  className="gap-1.5 text-xs"
                >
                  <Share2 className="size-3.5" />
                  <span>{locale === "hi" ? "शेयर करें" : "Share"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="size-3.5" />
                  <span>{locale === "hi" ? "प्रिंट" : "Print"}</span>
                </Button>
                <Link
                  href="/report"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "gap-1.5 text-xs"
                  )}
                >
                  <FileText className="size-3.5" />
                  <span>{locale === "hi" ? "पूर्ण रिपोर्ट" : "Full Report"}</span>
                </Link>
              </div>
            </div>

            <h2 className="text-lg font-semibold">{plan.headline}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {locale === "hi" ? "लागत श्रेणी:" : "Cost Tier:"} {budgetTier.replace("_", " ")}
              </Badge>
              <Badge variant="outline">
                {locale === "hi" ? "समुदाय आकार:" : "Community Size:"} ~{approxPopulation}
              </Badge>
              {availableResources.trim() ? (
                <Badge variant="outline">
                  {locale === "hi" ? "संसाधन:" : "Resources:"} {availableResources.trim()}
                </Badge>
              ) : null}
            </div>
            {contextMeta ? <ContextMetaStrip meta={contextMeta} /> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                title: locale === "hi" ? "आज" : "Today",
                items: plan.immediateActions,
              },
              {
                title: locale === "hi" ? "इस सप्ताह" : "This Week",
                items: plan.weeklyActions,
              },
              {
                title: locale === "hi" ? "इस महीने" : "This Month",
                items: plan.longTermActions,
              },
            ].map((section) => (
              <Card key={section.title} size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
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
              {locale === "hi"
                ? `जिम्मेदारियाँ, चेकलिस्ट (${completedChecklist.length}/${plan.implementationChecklist.length}) और स्वास्थ्य नोट्स`
                : `Checklist (${completedChecklist.length}/${plan.implementationChecklist.length}), roles & safety notes`}
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2.5">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Users className="size-4 text-primary" aria-hidden="true" />
                    {locale === "hi" ? "जिम्मेदार श्रेणियाँ:" : "Stakeholders:"}{" "}
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
                          onClick={() => toggleChecklistItem(c)}
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
                    {locale === "hi"
                      ? "अपेक्षित परिणाम व स्वास्थ्य सुरक्षा"
                      : "Outcomes & Health Safety"}
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
      ) : (
        <EmptyStateCard
          title={
            locale === "hi"
              ? "समन्वित सामुदायिक स्मॉग योजना तैयार करें"
              : "Design a Coordinated Community Smog Plan"
          }
          description={
            locale === "hi"
              ? "समुदाय प्रकार, आकार, बजट और संसाधन चुनकर कॉपी, शेयर व प्रिंट करने योग्य कार्य योजना पाएं।"
              : "Configure community type, scale, budget, and resources above to generate a copyable, printable smog readiness plan."
          }
          action={
            <Button type="button" onClick={() => void generateCommunityPlan()}>
              {locale === "hi" ? "कार्य योजना बनाएँ" : "Generate Action Plan"}
            </Button>
          }
        />
      )}
    </div>
  );
}
