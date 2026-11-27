"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
  AiPrivacyAccordion,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { EmptyStateCard } from "@/components/common/Controls";
import { CommunityActionPlanResults } from "@/components/modules/CommunityActionPlanResults";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { useAiModuleRequest } from "@/hooks/useAiModuleRequest";
import { toAiLocationPayload } from "@/lib/ai/client";
import type { AiCommunityPlanResponse } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { BudgetTier } from "@/types/domain";

export function CommunityView() {
  const {
    selectedLocation,
    locale,
    recommendationFingerprint,
    logActivity,
    addToast,
  } = useAppPreferences();

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

  const {
    loading,
    data: plan,
    generatedFingerprint,
    aiGenerated,
    provenanceMode,
    modelUsed,
    citations,
    contextMeta,
    errorState,
    execute,
    applyFallback,
  } = useAiModuleRequest<AiCommunityPlanResponse>({
    endpoint: "/api/ai/community",
    locationKey: selectedLocation.id,
    fallbackErrorMessage: "Unable to generate community action plan.",
    networkErrorMessage: "Network error while contacting Community Planner.",
    successToastMessage:
      locale === "hi"
        ? "सामुदायिक कार्य योजना तैयार हुई।"
        : "Community action plan generated.",
    recommendationFingerprint,
    addToast,
  });

  const generateCommunityPlan = async () => {
    setCompletedChecklist([]);
    await execute({
      locale,
      location: toAiLocationPayload(selectedLocation),
      communityType,
      approxPopulation: Math.max(10, Math.min(50000, approxPopulation)),
      budgetTier,
      timeframe,
      availableResources: availableResources.trim() || undefined,
    });
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

          <AiPrivacyAccordion
            summaryLabel={
              locale === "hi"
                ? "समय-सीमा, संसाधन और AI गोपनीयता"
                : "Timeframe, resources & AI privacy"
            }
          >
            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </AiPrivacyAccordion>
        </CardContent>
      </Card>

      {errorState ? (
        <AiErrorRecoveryCard
          message={errorState.message}
          errorCode={errorState.errorCode}
          onRetry={() => void generateCommunityPlan()}
          hasFallback={Boolean(errorState.fallback)}
          onUseFallback={applyFallback}
        />
      ) : null}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : plan ? (
        <CommunityActionPlanResults
          plan={plan}
          aiGenerated={aiGenerated}
          provenanceMode={provenanceMode}
          modelUsed={modelUsed}
          citations={citations}
          contextMeta={contextMeta}
          budgetTier={budgetTier}
          approxPopulation={approxPopulation}
          availableResources={availableResources}
          completedChecklist={completedChecklist}
          copiedPlan={copiedPlan}
          locale={locale}
          onCopyPlan={() => void handleCopyPlan()}
          onSharePlan={() => void handleSharePlan()}
          onToggleChecklistItem={toggleChecklistItem}
        />
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
