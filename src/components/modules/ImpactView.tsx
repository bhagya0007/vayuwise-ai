"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ActivityTrackerCard } from "@/components/modules/impact/ActivityTrackerCard";
import { ExposureComparisonCard } from "@/components/modules/impact/ExposureComparisonCard";
import {
  ImpactAiExplanationCard,
  type ImpactAiExplainState,
} from "@/components/modules/impact/ImpactAiExplanationCard";
import {
  ImpactPresetBar,
  ImpactWhatIfCard,
  type ImpactPresetPatch,
} from "@/components/modules/impact/ImpactCalculatorControls";
import {
  ImpactComparisonChartCard,
  type ImpactHorizon,
} from "@/components/modules/impact/ImpactComparisonChartCard";
import { ImpactMethodologyCard } from "@/components/modules/impact/ImpactMethodologyCard";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { useAirQualityForecast } from "@/hooks/useAirQualityForecast";
import { useSyncedImpactInputs } from "@/hooks/useSyncedImpactInputs";
import {
  postAiEndpoint,
  toAiLocationPayload,
  type AiModuleErrorState,
} from "@/lib/ai/client";
import type { AiImpactExplainResponse } from "@/lib/ai/schemas";
import { getEmissionFactorForMode } from "@/lib/impact/emission-factors";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";

/**
 * Deterministic environmental impact lab comparing baseline vs. alternative travel
 * CO2e emissions alongside a separate outdoor PM2.5 concentration-time tab.
 */
export function ImpactView() {
  const searchParams = useSearchParams();
  const { profile, selectedLocation, locale, phase04Dict, addToast } =
    useAppPreferences();
  const dict = phase04Dict.impact;

  const { values, updateValues } = useSyncedImpactInputs(profile, searchParams);
  const {
    distanceKm,
    baseDaysPerWeek,
    altDaysPerWeek,
    workingWeeks,
    baselineMode,
    altMode,
    baseOccupancy,
  } = values;

  const [altOccupancy, setAltOccupancy] = useState<number>(3);
  const [horizon, setHorizon] = useState<ImpactHorizon>("annual");
  const [activeTab, setActiveTab] = useState<"travel" | "exposure">("travel");
  const [showMethodology, setShowMethodology] = useState(false);

  const { activeForecast: forecast, loading: loadingForecast } =
    useAirQualityForecast(selectedLocation, { forecastDays: 3 });

  const baseFactor = getEmissionFactorForMode(baselineMode);
  const altFactor = getEmissionFactorForMode(altMode);

  const clampedBaseOcc = Math.min(
    baseFactor.maxOccupancy,
    Math.max(baseFactor.minOccupancy, baseOccupancy)
  );
  const clampedAltOcc = Math.min(
    altFactor.maxOccupancy,
    Math.max(altFactor.minOccupancy, altOccupancy)
  );

  const calculationOutcome = useMemo(() => {
    try {
      const comparison = compareTransportScenarios({
        baseline: {
          mode: baselineMode,
          roundTripDistanceKm: distanceKm,
          travelDaysPerWeek: baseDaysPerWeek,
          workingWeeksPerYear: workingWeeks,
          occupancy: clampedBaseOcc,
        },
        alternative: {
          mode: altMode,
          roundTripDistanceKm: distanceKm,
          travelDaysPerWeek: altDaysPerWeek,
          workingWeeksPerYear: workingWeeks,
          occupancy: clampedAltOcc,
        },
      });
      return { ok: true as const, comparison };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Invalid inputs",
      };
    }
  }, [
    baselineMode,
    altMode,
    distanceKm,
    baseDaysPerWeek,
    altDaysPerWeek,
    workingWeeks,
    clampedBaseOcc,
    clampedAltOcc,
  ]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ImpactAiExplainState | null>(null);
  const [aiError, setAiError] =
    useState<AiModuleErrorState<AiImpactExplainResponse> | null>(null);

  const scenarioSignature = JSON.stringify({
    loc: selectedLocation.id,
    locale,
    distanceKm,
    baseDaysPerWeek,
    altDaysPerWeek,
    workingWeeks,
    baselineMode,
    altMode,
    clampedBaseOcc,
    clampedAltOcc,
  });

  const activeAiExplanation =
    aiResult && aiResult.signature === scenarioSignature ? aiResult : null;

  const explainImpactWithGemini = async () => {
    if (!calculationOutcome.ok) return;
    setAiLoading(true);
    setAiError(null);

    const res = await postAiEndpoint<AiImpactExplainResponse>({
      endpoint: "/api/ai/impact",
      fallbackErrorMessage: "Unable to explain impact via Gemini.",
      networkErrorMessage: "Network error while requesting Gemini explanation.",
      body: {
        locale,
        location: toAiLocationPayload(selectedLocation),
        profile,
        baseline: {
          mode: baselineMode,
          roundTripDistanceKm: distanceKm,
          travelDaysPerWeek: baseDaysPerWeek,
          workingWeeksPerYear: workingWeeks,
          occupancy: clampedBaseOcc,
        },
        alternative: {
          mode: altMode,
          roundTripDistanceKm: distanceKm,
          travelDaysPerWeek: altDaysPerWeek,
          workingWeeksPerYear: workingWeeks,
          occupancy: clampedAltOcc,
        },
      },
    });

    setAiLoading(false);
    if (!res.ok || !res.payload) {
      if (res.error) setAiError(res.error);
      return;
    }

    setAiResult({
      signature: scenarioSignature,
      data: res.payload.data,
      aiGenerated: res.payload.aiGenerated,
      provenanceMode: res.payload.provenanceMode,
      modelUsed: res.payload.modelUsed,
      citations: res.payload.citations,
      contextMeta: res.payload.contextMeta ?? undefined,
    });
    addToast(
      locale === "hi"
        ? "पर्यावरणीय प्रभाव व्याख्या तैयार है।"
        : "Impact explanation generated."
    );
  };

  const applyPreset = (preset: ImpactPresetPatch) => {
    updateValues({
      ...(preset.base !== undefined ? { baselineMode: preset.base } : {}),
      ...(preset.alt !== undefined ? { altMode: preset.alt } : {}),
      ...(preset.baseDays !== undefined ? { baseDaysPerWeek: preset.baseDays } : {}),
      ...(preset.altDays !== undefined ? { altDaysPerWeek: preset.altDays } : {}),
      ...(preset.baseOcc !== undefined ? { baseOccupancy: preset.baseOcc } : {}),
    });
    if (preset.altOcc !== undefined) setAltOccupancy(preset.altOcc);
  };

  const comp = calculationOutcome.ok ? calculationOutcome.comparison : null;
  const heroAvoidedValue = comp
    ? horizon === "daily"
      ? comp.avoidedDailyKgCo2e
      : horizon === "weekly"
        ? comp.avoidedWeeklyKgCo2e
        : horizon === "monthly"
          ? comp.avoidedMonthlyKgCo2e
          : comp.avoidedAnnualKgCo2e
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Summary Bento */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-emerald-950/20 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 space-y-3">
            <Badge
              variant="outline"
              className="h-auto max-w-full whitespace-normal border-primary/35 bg-primary/10 px-2.5 py-1 text-left text-primary"
            >
              {dict.badge}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {dict.title}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{dict.subtitle}</p>
          </div>

          {comp ? (
            <div className="min-w-[260px] rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {comp.isNegativeSavings
                    ? dict.heroIncreaseLabel
                    : comp.avoidedAnnualKgCo2e === 0
                      ? dict.heroZeroLabel
                      : dict.heroAvoidedLabel}
                </span>
                {comp.isNegativeSavings ? (
                  <TrendingUp className="size-4 text-rose-500" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-4 text-emerald-500" aria-hidden="true" />
                )}
              </div>
              <p
                className={`mt-1 text-3xl font-bold tabular-nums ${
                  comp.isNegativeSavings ? "text-rose-500" : "text-emerald-500"
                }`}
              >
                {comp.isNegativeSavings ? "+" : ""}
                {Math.abs(heroAvoidedValue).toLocaleString("en-US", {
                  minimumFractionDigits: horizon === "daily" ? 2 : 1,
                  maximumFractionDigits: horizon === "daily" ? 2 : 1,
                })}{" "}
                <span className="text-base font-medium text-foreground">
                  kg CO₂e
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {phase04Dict.commuteModes[baselineMode]} →{" "}
                {phase04Dict.commuteModes[altMode]} ·{" "}
                {horizon === "daily"
                  ? dict.dailyLabel
                  : horizon === "weekly"
                    ? dict.weeklyLabel
                    : horizon === "monthly"
                      ? dict.monthlyLabel
                      : dict.annualLabel}
              </p>
              <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
                {dict.estimationNotice}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        role="tablist"
        aria-label={locale === "hi" ? "प्रभाव अनुभाग" : "Impact sections"}
        className="inline-flex rounded-xl border border-border bg-card p-1 text-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "travel"}
          onClick={() => setActiveTab("travel")}
          className={`rounded-lg px-3.5 py-1.5 font-medium ${
            activeTab === "travel"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {locale === "hi" ? "यात्रा CO₂e तुलना" : "Travel CO₂e Impact"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "exposure"}
          onClick={() => setActiveTab("exposure")}
          className={`rounded-lg px-3.5 py-1.5 font-medium ${
            activeTab === "exposure"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {locale === "hi" ? "बाहरी एक्सपोज़र तुलना" : "Outdoor Exposure Comparison"}
        </button>
      </div>

      {activeTab === "travel" ? (
        <>
          <ImpactPresetBar
            baselineMode={baselineMode}
            locale={locale}
            dict={dict}
            onApplyPreset={applyPreset}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <ImpactWhatIfCard
              distanceKm={distanceKm}
              baselineMode={baselineMode}
              altMode={altMode}
              baseDaysPerWeek={baseDaysPerWeek}
              altDaysPerWeek={altDaysPerWeek}
              workingWeeks={workingWeeks}
              clampedBaseOcc={clampedBaseOcc}
              clampedAltOcc={clampedAltOcc}
              baseFactor={baseFactor}
              altFactor={altFactor}
              locale={locale}
              phase04Dict={phase04Dict}
              onUpdateValues={updateValues}
              onSetAltOccupancy={setAltOccupancy}
            />

            <ImpactComparisonChartCard
              comp={comp}
              calculationError={calculationOutcome.ok ? undefined : calculationOutcome.error}
              baselineMode={baselineMode}
              altMode={altMode}
              horizon={horizon}
              onHorizonChange={setHorizon}
              locale={locale}
              phase04Dict={phase04Dict}
            />
          </div>

          <ImpactAiExplanationCard
            title={dict.explainTitle}
            buttonLabel={dict.explainBtn}
            locale={locale}
            aiLoading={aiLoading}
            disabled={!calculationOutcome.ok}
            aiError={aiError}
            activeAiExplanation={activeAiExplanation}
            onExplain={() => void explainImpactWithGemini()}
            onUseFallback={() => {
              if (!aiError?.fallback) return;
              setAiResult({
                signature: scenarioSignature,
                data: aiError.fallback,
                aiGenerated: false,
                citations: [],
                contextMeta: aiError.contextMeta,
              });
              setAiError(null);
            }}
          />

          <ImpactMethodologyCard
            title={dict.methodologyTitle}
            baselineHeading={dict.baselineHeading}
            alternativeHeading={dict.alternativeHeading}
            comp={comp}
            showMethodology={showMethodology}
            onToggle={() => setShowMethodology((s) => !s)}
            locale={locale}
          />

          <ActivityTrackerCard
            activeBaselineMode={baselineMode}
            activeAlternativeMode={altMode}
            activeDistanceKm={distanceKm}
            activeOccupancy={clampedAltOcc}
          />
        </>
      ) : (
        <ExposureComparisonCard forecast={forecast} loadingForecast={loadingForecast} />
      )}
    </div>
  );
}
