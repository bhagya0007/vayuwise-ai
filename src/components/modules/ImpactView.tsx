"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { ActivityTrackerCard } from "@/components/modules/impact/ActivityTrackerCard";
import { ExposureComparisonCard } from "@/components/modules/impact/ExposureComparisonCard";
import {
  ImpactAiExplanationCard,
  type ImpactAiExplainState,
} from "@/components/modules/impact/ImpactAiExplanationCard";
import {
  ImpactComparisonChartCard,
  type ImpactHorizon,
} from "@/components/modules/impact/ImpactComparisonChartCard";
import { ImpactMethodologyCard } from "@/components/modules/impact/ImpactMethodologyCard";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  COMMUTE_MODES,
  SELECT_CONTROL_CLASS,
} from "@/lib/personalization/form-shared";
import type { CommuteMode } from "@/types/domain";

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

  const applyPreset = (preset: {
    base: Exclude<CommuteMode, "walk_cycle">;
    alt: Exclude<CommuteMode, "walk_cycle">;
    baseDays?: number;
    altDays?: number;
    baseOcc?: number;
    altOcc?: number;
  }) => {
    updateValues({
      baselineMode: preset.base,
      altMode: preset.alt,
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
              <p className="mt-2 text-[11px] text-amber-500/90">
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
          className={`rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
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
          className={`rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              {dict.scenarioPresetsTitle}:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset({
                  base: "car_petrol",
                  alt: "metro_rail",
                  baseDays: 5,
                  altDays: 5,
                  baseOcc: 1,
                })
              }
            >
              {locale === "hi" ? "पेट्रोल कार बनाम मेट्रो" : "Petrol Car vs Metro"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset({
                  base: "car_petrol",
                  alt: "carpool",
                  baseDays: 5,
                  altDays: 5,
                  baseOcc: 1,
                  altOcc: 3,
                })
              }
            >
              {locale === "hi" ? "अकेले ड्राइव बनाम कारपूल (3)" : "Solo vs Carpool (3p)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset({
                  base: baselineMode === "work_from_home" ? "car_petrol" : baselineMode,
                  alt: "work_from_home",
                  baseDays: 5,
                  altDays: 5,
                })
              }
            >
              {locale === "hi" ? "ऑन-साइट बनाम रिमोट" : "On-site vs Remote"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset({
                  base: baselineMode,
                  alt: baselineMode,
                  baseDays: 5,
                  altDays: 3,
                })
              }
            >
              {locale === "hi" ? "हाइब्रिड शेड्यूल (5 → 3 दिन)" : "Hybrid Schedule (5d → 3d)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset({
                  base: "bus",
                  alt: "car_petrol",
                  baseDays: 5,
                  altDays: 5,
                  baseOcc: 1,
                  altOcc: 1,
                })
              }
            >
              {locale === "hi" ? "बस → कार (नकारात्मक जांच)" : "Bus → Petrol Car (+Increase)"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-5 border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="size-4 text-primary" aria-hidden="true" />
                  <span>{dict.whatIfTitle}</span>
                </CardTitle>
                <CardDescription>
                  {locale === "hi"
                    ? "दूरी, साधन और दिन बदलकर तुरंत उत्सर्जन अंतर देखें।"
                    : "Adjust daily distance, travel modes, and days per week."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="impact-distance">{dict.distanceLabel}</Label>
                    <span className="text-xs font-semibold tabular-nums text-primary">
                      {distanceKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={dict.distanceLabel}
                    min={0}
                    max={120}
                    step={0.5}
                    value={Math.min(120, distanceKm)}
                    onChange={(e) => updateValues({ distanceKm: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                  <Input
                    id="impact-distance"
                    type="number"
                    min={0}
                    max={500}
                    step={0.5}
                    value={distanceKm}
                    onChange={(e) =>
                      updateValues({ distanceKm: Math.max(0, Number(e.target.value)) })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="impact-baseline">{dict.baselineModeLabel}</Label>
                    <select
                      id="impact-baseline"
                      value={baselineMode}
                      onChange={(e) =>
                        updateValues({
                          baselineMode: e.target.value as Exclude<CommuteMode, "walk_cycle">,
                        })
                      }
                      className={SELECT_CONTROL_CLASS}
                    >
                      {COMMUTE_MODES.map((m) => (
                        <option key={m} value={m}>
                          {phase04Dict.commuteModes[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="impact-alt">{dict.altModeLabel}</Label>
                    <select
                      id="impact-alt"
                      value={altMode}
                      onChange={(e) =>
                        updateValues({
                          altMode: e.target.value as Exclude<CommuteMode, "walk_cycle">,
                        })
                      }
                      className={SELECT_CONTROL_CLASS}
                    >
                      {COMMUTE_MODES.map((m) => (
                        <option key={m} value={m}>
                          {phase04Dict.commuteModes[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="impact-base-days" className="text-xs">
                    {dict.daysLabel}
                  </Label>
                  <Input
                    id="impact-base-days"
                    type="number"
                    min={0}
                    max={7}
                    value={baseDaysPerWeek}
                    onChange={(e) => {
                      const next = Math.min(7, Math.max(0, Number(e.target.value)));
                      updateValues({ baseDaysPerWeek: next, altDaysPerWeek: next });
                    }}
                  />
                </div>

                <details className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs">
                  <summary className="cursor-pointer select-none font-medium text-foreground">
                    {locale === "hi" ? "उन्नत सेटिंग्स" : "Advanced Settings"}
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="impact-alt-days" className="text-xs">
                          {locale === "hi" ? "वैकल्पिक दिन/सप्ताह" : "Alternative days/wk"}
                        </Label>
                        <Input
                          id="impact-alt-days"
                          type="number"
                          min={0}
                          max={7}
                          value={altDaysPerWeek}
                          onChange={(e) =>
                            updateValues({
                              altDaysPerWeek: Math.min(7, Math.max(0, Number(e.target.value))),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="impact-weeks" className="text-xs">
                          {dict.weeksLabel}
                        </Label>
                        <Input
                          id="impact-weeks"
                          type="number"
                          min={1}
                          max={52}
                          value={workingWeeks}
                          onChange={(e) =>
                            updateValues({
                              workingWeeks: Math.min(52, Math.max(1, Number(e.target.value))),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {baseFactor.basis === "vehicle_km" ? (
                        <div className="space-y-1">
                          <Label htmlFor="impact-base-occ" className="text-[11px] text-muted-foreground">
                            {locale === "hi" ? "वर्तमान" : "Current"} {dict.occupancyLabel} (
                            {baseFactor.minOccupancy}–{baseFactor.maxOccupancy})
                          </Label>
                          <Input
                            id="impact-base-occ"
                            type="number"
                            min={baseFactor.minOccupancy}
                            max={baseFactor.maxOccupancy}
                            value={clampedBaseOcc}
                            onChange={(e) =>
                              updateValues({ baseOccupancy: Number(e.target.value) || 1 })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      ) : null}

                      {altFactor.basis === "vehicle_km" ? (
                        <div className="space-y-1">
                          <Label htmlFor="impact-alt-occ" className="text-[11px] text-muted-foreground">
                            {locale === "hi" ? "वैकल्पिक" : "Alt"} {dict.occupancyLabel} (
                            {altFactor.minOccupancy}–{altFactor.maxOccupancy})
                          </Label>
                          <Input
                            id="impact-alt-occ"
                            type="number"
                            min={altFactor.minOccupancy}
                            max={altFactor.maxOccupancy}
                            value={clampedAltOcc}
                            onChange={(e) => setAltOccupancy(Number(e.target.value) || 1)}
                            className="h-8 text-xs"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>

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
