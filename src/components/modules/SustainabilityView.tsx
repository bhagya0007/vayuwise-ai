"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Leaf,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
  AiPrivacyAccordion,
  AiProvenanceBadge,
  WhyRecommendationToggle,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { EmptyStateCard } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { useAiModuleRequest } from "@/hooks/useAiModuleRequest";
import { toAiLocationPayload } from "@/lib/ai/client";
import type { AiSustainabilityResponse } from "@/lib/ai/schemas";
import { evaluateSustainabilityTransportSwap } from "@/lib/impact/sustainability-swap";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BudgetTier } from "@/types/domain";

export function SustainabilityView() {
  const {
    selectedLocation,
    profile,
    locale,
    recommendationFingerprint,
    logActivity,
    addToast,
  } = useAppPreferences();

  const [focusArea, setFocusArea] = useState<
    | "all"
    | "daily_commute"
    | "school_college_travel"
    | "household_energy"
    | "waste_practices"
    | "community_sustainability"
  >("all");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(profile.budgetTier);

  const {
    loading,
    data,
    generatedFingerprint,
    aiGenerated,
    provenanceMode,
    modelUsed,
    citations,
    contextMeta,
    errorState,
    execute,
    applyFallback,
  } = useAiModuleRequest<AiSustainabilityResponse>({
    endpoint: "/api/ai/sustainability",
    locationKey: selectedLocation.id,
    fallbackErrorMessage: "Unable to reach Sustainability Coach.",
    networkErrorMessage: "Network error while contacting Sustainability Coach.",
    successToastMessage:
      locale === "hi"
        ? "टिकाऊ विकल्प तैयार किए गए।"
        : "Sustainable alternatives generated.",
    recommendationFingerprint,
    addToast,
  });

  const evaluateAltSwap = (alt: AiSustainabilityResponse["alternatives"][number]) =>
    evaluateSustainabilityTransportSwap({
      domain: alt.domain,
      currentActivity: alt.currentActivity,
      suggestedAlternative: alt.suggestedAlternative,
      profilePrimaryCommute: profile.primaryCommute,
      dailyCommuteKm: profile.dailyCommuteKm,
      commuteDaysPerWeek: profile.commuteDaysPerWeek ?? 5,
      workingWeeksPerYear: profile.workingWeeksPerYear ?? 48,
      vehicleOccupancy: profile.vehicleOccupancy ?? 1,
    });

  const generateAlternatives = async () => {
    await execute({
      locale,
      location: toAiLocationPayload(selectedLocation),
      profile,
      focusArea,
      budgetTier,
    });
  };

  const handleLogAlternative = (alt: AiSustainabilityResponse["alternatives"][number]) => {
    const swap = evaluateAltSwap(alt);
    const hasVerifiedTransport =
      swap.quantified && Boolean(swap.baselineMode && swap.alternativeMode);

    const outcome = logActivity({
      activityType: !hasVerifiedTransport
        ? "indoor_air_action"
        : swap.alternativeMode === "work_from_home"
          ? "avoided_travel"
          : swap.alternativeMode === "carpool"
            ? "carpooled"
            : "used_public_transport",
      title: alt.suggestedAlternative.slice(0, 120),
      dedupeKey: `sust:${alt.id}`,
      baselineMode: hasVerifiedTransport ? swap.baselineMode : undefined,
      alternativeMode: hasVerifiedTransport ? swap.alternativeMode : undefined,
      distanceKm: hasVerifiedTransport ? profile.dailyCommuteKm : undefined,
      occupancy:
        hasVerifiedTransport && swap.alternativeMode === "carpool" ? 3 : 1,
    });

    if (!outcome.added) {
      addToast(
        locale === "hi"
          ? "यह कार्य आज पहले ही दर्ज किया जा चुका है।"
          : "Already logged for today (duplicate avoided).",
        "info"
      );
      return;
    }

    addToast(
      locale === "hi"
        ? "गतिविधि आपके हरित ट्रैकर में सहेजी गई।"
        : "Completed swap logged to Green Activity Tracker."
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {locale === "hi" ? "हरित जीवन विकल्प" : "Green Choices"}
              </h1>
              <CardDescription>
                {locale === "hi"
                  ? `${selectedLocation.name} के AQI के अनुसार सुरक्षित कम-उत्सर्जन विकल्प।`
                  : `Health-aware low-emission swaps suited to ${selectedLocation.name} AQI.`}
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => void generateAlternatives()}
              disabled={loading}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>
                {locale === "hi" ? "विकल्प सुझाएँ" : "Suggest Alternatives"}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sus-focus-select" className="text-xs">
                {locale === "hi" ? "मुख्य क्षेत्र" : "Focus Area"}
              </Label>
              <select
                id="sus-focus-select"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value as typeof focusArea)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="all">
                  {locale === "hi" ? "सभी श्रेणियाँ" : "All Categories"}
                </option>
                <option value="daily_commute">
                  {locale === "hi" ? "दैनिक यात्रा" : "Daily Commuting"}
                </option>
                <option value="school_college_travel">
                  {locale === "hi" ? "स्कूल व कॉलेज यात्रा" : "School & College Travel"}
                </option>
                <option value="household_energy">
                  {locale === "hi" ? "घरेलू ऊर्जा" : "Household Energy"}
                </option>
                <option value="waste_practices">
                  {locale === "hi" ? "कचरा व दहन रोकथाम" : "Waste Practices"}
                </option>
                <option value="community_sustainability">
                  {locale === "hi" ? "सामुदायिक पहल" : "Community Sustainability"}
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sus-budget-select" className="text-xs">
                {locale === "hi" ? "बजट स्तर" : "Budget"}
              </Label>
              <select
                id="sus-budget-select"
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="free">
                  {locale === "hi" ? "शून्य-खर्च उपाय" : "Zero-Cost Actions"}
                </option>
                <option value="low_cost">
                  {locale === "hi" ? "कम-खर्च विकल्प" : "Low-Cost Swaps"}
                </option>
                <option value="investment">
                  {locale === "hi" ? "निवेश स्तर" : "Investment Tier"}
                </option>
              </select>
            </div>
          </div>

          <AiPrivacyAccordion
            summaryLabel={
              locale === "hi" ? "AI गोपनीयता और प्रोफ़ाइल संदर्भ" : "AI privacy & profile context"
            }
          >
            <PersonalizationStatusStrip generatedFingerprint={generatedFingerprint} />
            <AiDisclosureNote />
          </AiPrivacyAccordion>
        </CardContent>
      </Card>

      {errorState ? (
        <AiErrorRecoveryCard
          message={errorState.message}
          errorCode={errorState.errorCode}
          onRetry={() => void generateAlternatives()}
          hasFallback={Boolean(errorState.fallback)}
          onUseFallback={applyFallback}
        />
      ) : null}

      {loading ? (
        <Skeleton className="h-60 w-full rounded-2xl" />
      ) : data ? (
        <div className="space-y-5">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <AiProvenanceBadge
              aiGenerated={aiGenerated}
              provenanceMode={provenanceMode}
              modelUsed={modelUsed}
            />
            <h2 className="text-base font-semibold sm:text-lg">{data.headline}</h2>
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
              <ShieldAlert
                className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <p>{data.healthPriorityNote}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.alternatives.map((alt) => {
              const swap = evaluateAltSwap(alt);
              const detPreview = swap.quantified ? swap.comparison ?? null : null;

              return (
                <Card key={alt.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary" className="gap-1 capitalize">
                        <Leaf className="size-3" aria-hidden="true" />
                        {alt.domain.replace(/_/g, " ")}
                      </Badge>
                      <div className="flex gap-1.5">
                        <Badge variant="outline">
                          {alt.feasibility}
                        </Badge>
                        <Badge variant="outline">
                          {alt.relativeCost.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    {/* Side-by-side Current vs Suggested Comparison */}
                    <div className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-border bg-muted/25 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {locale === "hi" ? "वर्तमान गतिविधि" : "Current Activity"}
                        </p>
                        <p className="mt-0.5 text-foreground/85">{alt.currentActivity}</p>
                      </div>
                      <div className="border-t border-border/60 pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          <ArrowRight className="size-3" aria-hidden="true" />
                          {locale === "hi" ? "सुझाया विकल्प" : "Suggested Alternative"}
                        </p>
                        <p className="mt-0.5 font-medium text-foreground">
                          {alt.suggestedAlternative}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    {detPreview ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-medium text-emerald-800 dark:text-emerald-300">
                        {locale === "hi" ? "अनुमानित लाभ:" : "Estimated benefit:"} ~
                        {detPreview.avoidedAnnualKgCo2e.toFixed(1)}{" "}
                        {swap.gasUnitLabel ?? "kg CO₂e"}/yr avoided ({profile.dailyCommuteKm} km/day)
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {locale === "hi" ? "प्रभाव संख्याबद्ध नहीं" : "Impact not quantified"}
                        </p>
                        <p className="mt-0.5">{alt.qualitativeEnvironmentalBenefit}</p>
                      </div>
                    )}

                    <details className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground">
                      <summary className="cursor-pointer select-none font-medium text-foreground/85">
                        {locale === "hi" ? "व्यावहारिक पहलू और विधि" : "Trade-offs & Methodology"}
                      </summary>
                      <div className="mt-2 space-y-2">
                        <p>{alt.qualitativeEnvironmentalBenefit}</p>
                        <p>
                          <span className="font-medium text-foreground">
                            {locale === "hi" ? "स्वास्थ्य पहलू:" : "Trade-off:"}
                          </span>{" "}
                          {alt.healthAndPracticalTradeOff}
                        </p>
                        {detPreview ? (
                          <div className="space-y-1 rounded-lg border border-border/70 bg-background/60 p-2 text-[11px]">
                            <p>
                              <span className="font-semibold text-foreground">
                                {locale === "hi" ? "स्रोत व सीमा:" : "Verified Factors & Boundaries:"}
                              </span>{" "}
                              {detPreview.baseline.factor.factorId} ({detPreview.baseline.factor.gasBasis},{" "}
                              {detPreview.baseline.factor.calculationBoundary}) vs{" "}
                              {detPreview.alternative.factor.factorId} ({detPreview.alternative.factor.gasBasis},{" "}
                              {detPreview.alternative.factor.calculationBoundary}) · {detPreview.registryVersion}
                            </p>
                            <p>
                              {detPreview.baseline.factor.sourceTitle} ·{" "}
                              {detPreview.alternative.factor.sourceTitle}
                            </p>
                          </div>
                        ) : null}
                        <WhyRecommendationToggle
                          explanation={alt.whyThisRecommendation}
                          contextMeta={contextMeta ?? undefined}
                          dataBasis={data.dataBasis}
                          sourceIds={alt.sourceIds}
                          citations={citations}
                          limitation={data.disclaimer}
                        />
                      </div>
                    </details>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {detPreview && swap.baselineMode && swap.alternativeMode ? (
                        <Link
                          href={`/impact?baseline=${swap.baselineMode}&alternative=${swap.alternativeMode}&distance=${profile.dailyCommuteKm}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "gap-1.5 text-xs"
                          )}
                        >
                          <BarChart3 className="size-3.5 text-primary" aria-hidden="true" />
                          <span>
                            {locale === "hi"
                              ? "प्रभाव की गणना करें →"
                              : "Calculate Impact →"}
                          </span>
                        </Link>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLogAlternative(alt)}
                        className="gap-1.5 text-xs"
                      >
                        <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
                        <span>
                          {locale === "hi" ? "पूर्ण गतिविधि दर्ज करें" : "Log Completed"}
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyStateCard
          title={
            locale === "hi"
              ? "सुरक्षित टिकाऊ विकल्प खोजें"
              : "Explore Safe Sustainable Alternatives"
          }
          description={
            locale === "hi"
              ? "ऊपर अपना क्षेत्र और बजट चुनें और वर्तमान प्रदूषण स्तर के अनुरूप व्यावहारिक सुझाव पाएं।"
              : "Choose a focus area and budget above to receive practical low-emission suggestions aligned with current smog conditions."
          }
          action={
            <Button type="button" onClick={() => void generateAlternatives()}>
              {locale === "hi" ? "विकल्प सुझाएँ" : "Suggest Alternatives"}
            </Button>
          }
        />
      )}
    </div>
  );
}
