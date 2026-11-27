"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  AiErrorRecoveryCard,
  AiProvenanceBadge,
  ContextMetaStrip,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { ActivityTrackerCard } from "@/components/modules/impact/ActivityTrackerCard";
import { ExposureComparisonCard } from "@/components/modules/impact/ExposureComparisonCard";
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
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiImpactExplainResponse } from "@/lib/ai/schemas";
import {
  EMISSION_FACTOR_REGISTRY,
  getEmissionFactorForMode,
} from "@/lib/impact/emission-factors";
import {
  compareTransportScenarios,
  formatSignedCo2eDiff,
} from "@/lib/impact/transport-calculator";
import { normalizeLegacyCommuteMode } from "@/lib/personalization/profile-storage";
import { commuteModeSchema } from "@/lib/schemas";
import type { AirQualityForecast, CommuteMode } from "@/types/domain";

const ALL_MODES: readonly Exclude<CommuteMode, "walk_cycle">[] = [
  "car_petrol",
  "car_diesel",
  "car_cng",
  "car_electric",
  "two_wheeler",
  "two_wheeler_electric",
  "carpool",
  "bus",
  "metro_rail",
  "walk",
  "cycle",
  "work_from_home",
] as const;

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function ImpactView() {
  const searchParams = useSearchParams();
  const { profile, selectedLocation, locale, phase04Dict, addToast } =
    useAppPreferences();
  const dict = phase04Dict.impact;

  const profileDefaultMode = normalizeLegacyCommuteMode(profile.primaryCommute);
  const defaultBaseFromProfile: Exclude<CommuteMode, "walk_cycle"> =
    profileDefaultMode === "metro_rail" || profileDefaultMode === "work_from_home"
      ? "car_petrol"
      : profileDefaultMode;

  const initialBaseFromUrl = commuteModeSchema.safeParse(
    searchParams.get("baseline")
  );
  const initialAltFromUrl = commuteModeSchema.safeParse(
    searchParams.get("alternative")
  );
  const rawDistParam = searchParams.get("distance");
  const parsedDistParam =
    rawDistParam !== null && rawDistParam.trim() !== ""
      ? Number(rawDistParam)
      : null;

  const urlDefaultDistance =
    parsedDistParam !== null &&
    Number.isFinite(parsedDistParam) &&
    parsedDistParam >= 0 &&
    parsedDistParam <= 300
      ? parsedDistParam
      : null;

  const defaultDistanceKm = urlDefaultDistance ?? profile.dailyCommuteKm;
  const defaultBaseDays = profile.commuteDaysPerWeek ?? 5;
  const defaultWorkingWeeks = profile.workingWeeksPerYear ?? 48;
  const defaultBaseMode = initialBaseFromUrl.success
    ? normalizeLegacyCommuteMode(initialBaseFromUrl.data)
    : defaultBaseFromProfile;
  const defaultAltMode = initialAltFromUrl.success
    ? normalizeLegacyCommuteMode(initialAltFromUrl.data)
    : "metro_rail";
  const defaultBaseOcc = profile.vehicleOccupancy ?? 1;

  // Profile-synced overrides: automatically stay synced with profile changes until user edits calculator inputs directly.
  const [distanceEdit, setDistanceEdit] = useState<{ base: number; val: number } | null>(null);
  const [baseDaysEdit, setBaseDaysEdit] = useState<{ base: number; val: number } | null>(null);
  const [altDaysEdit, setAltDaysEdit] = useState<{ base: number; val: number } | null>(null);
  const [weeksEdit, setWeeksEdit] = useState<{ base: number; val: number } | null>(null);
  const [baseModeEdit, setBaseModeEdit] = useState<{ base: string; val: Exclude<CommuteMode, "walk_cycle"> } | null>(null);
  const [altModeEdit, setAltModeEdit] = useState<{ base: string; val: Exclude<CommuteMode, "walk_cycle"> } | null>(null);
  const [baseOccEdit, setBaseOccEdit] = useState<{ base: number; val: number } | null>(null);

  const distanceKm =
    distanceEdit && distanceEdit.base === defaultDistanceKm
      ? distanceEdit.val
      : defaultDistanceKm;
  const setDistanceKm = (val: number) =>
    setDistanceEdit({ base: defaultDistanceKm, val });

  const baseDaysPerWeek =
    baseDaysEdit && baseDaysEdit.base === defaultBaseDays
      ? baseDaysEdit.val
      : defaultBaseDays;
  const setBaseDaysPerWeek = (val: number) =>
    setBaseDaysEdit({ base: defaultBaseDays, val });

  const altDaysPerWeek =
    altDaysEdit && altDaysEdit.base === defaultBaseDays
      ? altDaysEdit.val
      : defaultBaseDays;
  const setAltDaysPerWeek = (val: number) =>
    setAltDaysEdit({ base: defaultBaseDays, val });

  const workingWeeks =
    weeksEdit && weeksEdit.base === defaultWorkingWeeks
      ? weeksEdit.val
      : defaultWorkingWeeks;
  const setWorkingWeeks = (val: number) =>
    setWeeksEdit({ base: defaultWorkingWeeks, val });

  const baselineMode =
    baseModeEdit && baseModeEdit.base === defaultBaseMode
      ? baseModeEdit.val
      : defaultBaseMode;
  const setBaselineMode = (val: Exclude<CommuteMode, "walk_cycle">) =>
    setBaseModeEdit({ base: defaultBaseMode, val });

  const altMode =
    altModeEdit && altModeEdit.base === defaultAltMode
      ? altModeEdit.val
      : defaultAltMode;
  const setAltMode = (val: Exclude<CommuteMode, "walk_cycle">) =>
    setAltModeEdit({ base: defaultAltMode, val });

  const baseOccupancy =
    baseOccEdit && baseOccEdit.base === defaultBaseOcc
      ? baseOccEdit.val
      : defaultBaseOcc;
  const setBaseOccupancy = (val: number) =>
    setBaseOccEdit({ base: defaultBaseOcc, val });

  const [altOccupancy, setAltOccupancy] = useState<number>(3);
  const [horizon, setHorizon] = useState<"daily" | "weekly" | "monthly" | "annual">("annual");
  const [activeTab, setActiveTab] = useState<"travel" | "exposure">("travel");
  const [showMethodology, setShowMethodology] = useState(false);

  // Live Air Quality fetch for separate concentration-time comparison card
  const [forecast, setForecast] = useState<AirQualityForecast | null>(null);
  const [fetchedLocKey, setFetchedLocKey] = useState<string | null>(null);
  const loadingForecast = fetchedLocKey !== selectedLocation.id;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(selectedLocation.latitude),
      lon: String(selectedLocation.longitude),
      name: selectedLocation.name,
      country: selectedLocation.country,
      countryCode: selectedLocation.countryCode,
      timezone: selectedLocation.timezone || "auto",
      forecastDays: "3",
    });
    if (selectedLocation.region) params.set("region", selectedLocation.region);

    fetch(`/api/air-quality?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((body: { ok?: boolean; forecast?: AirQualityForecast }) => {
        if (!controller.signal.aborted && body.ok && body.forecast) {
          setForecast(body.forecast);
        }
      })
      .catch(() => {
        // leave null cleanly
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFetchedLocKey(selectedLocation.id);
        }
      });

    return () => controller.abort();
  }, [selectedLocation]);

  // Deterministic transport calculation
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

  // Gemini Impact Explanation State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    signature: string;
    data: AiImpactExplainResponse;
    aiGenerated: boolean;
    provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
    modelUsed?: string;
    citations: VerifiedKnowledgeSource[];
    contextMeta?: AiContextMeta;
  } | null>(null);
  const [aiError, setAiError] = useState<{
    message: string;
    errorCode?: string;
    fallback?: AiImpactExplainResponse;
    contextMeta?: AiContextMeta;
  } | null>(null);

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
    try {
      const res = await fetch("/api/ai/impact", {
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
        }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        data?: AiImpactExplainResponse;
        fallbackData?: AiImpactExplainResponse;
        aiGenerated?: boolean;
        provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
        modelUsed?: string;
        citations?: VerifiedKnowledgeSource[];
        contextMeta?: AiContextMeta;
        errorCode?: string;
        message?: string;
      };

      if (!res.ok || !body.ok || !body.data) {
        setAiError({
          message: body.message ?? "Unable to explain impact via Gemini.",
          errorCode: body.errorCode,
          fallback: body.fallbackData,
          contextMeta: body.contextMeta,
        });
        return;
      }

      setAiResult({
        signature: scenarioSignature,
        data: body.data,
        aiGenerated: Boolean(body.aiGenerated),
        provenanceMode: body.provenanceMode,
        modelUsed: body.modelUsed,
        citations: body.citations ?? [],
        contextMeta: body.contextMeta,
      });
      addToast(
        locale === "hi"
          ? "पर्यावरणीय प्रभाव व्याख्या तैयार है।"
          : "Impact explanation generated."
      );
    } catch {
      setAiError({
        message: "Network error while requesting Gemini explanation.",
        errorCode: "NETWORK_ERROR",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const applyPreset = (preset: {
    base: Exclude<CommuteMode, "walk_cycle">;
    alt: Exclude<CommuteMode, "walk_cycle">;
    baseDays?: number;
    altDays?: number;
    baseOcc?: number;
    altOcc?: number;
  }) => {
    setBaselineMode(preset.base);
    setAltMode(preset.alt);
    if (preset.baseDays !== undefined) setBaseDaysPerWeek(preset.baseDays);
    if (preset.altDays !== undefined) setAltDaysPerWeek(preset.altDays);
    if (preset.baseOcc !== undefined) setBaseOccupancy(preset.baseOcc);
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

  const chartData = comp
    ? (() => {
        const baseVal =
          horizon === "daily"
            ? comp.baseline.dailyKgCo2e
            : horizon === "weekly"
              ? comp.baseline.weeklyKgCo2e
              : horizon === "monthly"
                ? comp.baseline.monthlyKgCo2e
                : comp.baseline.annualKgCo2e;
        const altVal =
          horizon === "daily"
            ? comp.alternative.dailyKgCo2e
            : horizon === "weekly"
              ? comp.alternative.weeklyKgCo2e
              : horizon === "monthly"
                ? comp.alternative.monthlyKgCo2e
                : comp.alternative.annualKgCo2e;
        return [
          {
            name: phase04Dict.commuteModes[baselineMode],
            emissions: Number(baseVal.toFixed(horizon === "daily" ? 3 : 1)),
          },
          {
            name: phase04Dict.commuteModes[altMode],
            emissions: Number(altVal.toFixed(horizon === "daily" ? 3 : 1)),
          },
        ];
      })()
    : [];

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
            <p className="max-w-2xl text-sm text-muted-foreground">
              {dict.subtitle}
            </p>
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
                  <TrendingUp className="size-4 text-rose-500" />
                ) : (
                  <TrendingDown className="size-4 text-emerald-500" />
                )}
              </div>
              <p
                className={`mt-1 text-3xl font-bold tabular-nums ${
                  comp.isNegativeSavings
                    ? "text-rose-500"
                    : "text-emerald-500"
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

      {/* Clean Secondary Tab Switcher: Travel Impact vs Outdoor Exposure */}
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
          {/* What-If Quick Presets */}
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

          {/* Main Bento Grid: 4 Essential Inputs + Chart */}
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
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <Input
                    id="impact-distance"
                    type="number"
                    min={0}
                    max={500}
                    step={0.5}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="impact-baseline">{dict.baselineModeLabel}</Label>
                    <select
                      id="impact-baseline"
                      value={baselineMode}
                      onChange={(e) =>
                        setBaselineMode(e.target.value as Exclude<CommuteMode, "walk_cycle">)
                      }
                      className={selectClass}
                    >
                      {ALL_MODES.map((m) => (
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
                        setAltMode(e.target.value as Exclude<CommuteMode, "walk_cycle">)
                      }
                      className={selectClass}
                    >
                      {ALL_MODES.map((m) => (
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
                      setBaseDaysPerWeek(next);
                      setAltDaysPerWeek(next);
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
                            setAltDaysPerWeek(Math.min(7, Math.max(0, Number(e.target.value))))
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
                            setWorkingWeeks(Math.min(52, Math.max(1, Number(e.target.value))))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {baseFactor.basis === "vehicle_km" ? (
                        <div className="space-y-1">
                          <Label htmlFor="impact-base-occ" className="text-[11px] text-muted-foreground">
                            Current {dict.occupancyLabel} ({baseFactor.minOccupancy}–{baseFactor.maxOccupancy})
                          </Label>
                          <Input
                            id="impact-base-occ"
                            type="number"
                            min={baseFactor.minOccupancy}
                            max={baseFactor.maxOccupancy}
                            value={clampedBaseOcc}
                            onChange={(e) => setBaseOccupancy(Number(e.target.value) || 1)}
                            className="h-8 text-xs"
                          />
                        </div>
                      ) : null}

                      {altFactor.basis === "vehicle_km" ? (
                        <div className="space-y-1">
                          <Label htmlFor="impact-alt-occ" className="text-[11px] text-muted-foreground">
                            Alt {dict.occupancyLabel} ({altFactor.minOccupancy}–{altFactor.maxOccupancy})
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

        {/* Chart & Horizon KPIs */}
        <Card className="lg:col-span-7 border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {locale === "hi"
                  ? "नियतात्मक उत्सर्जन तुलना (kg CO₂e)"
                  : "Deterministic CO₂e Comparison"}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-0.5 text-xs">
                {(["daily", "weekly", "monthly", "annual"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      horizon === h
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {h === "daily"
                      ? dict.dailyLabel
                      : h === "weekly"
                        ? dict.weeklyLabel
                        : h === "monthly"
                          ? dict.monthlyLabel
                          : dict.annualLabel}
                  </button>
                ))}
              </div>
            </div>
            {comp ? (
              <CardDescription>{comp.percentageNote}</CardDescription>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            {comp ? (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs">
                    <span className="text-muted-foreground">{dict.dailyLabel}</span>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatSignedCo2eDiff(comp.avoidedDailyKgCo2e, 2)} kg
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs">
                    <span className="text-muted-foreground">{dict.weeklyLabel}</span>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatSignedCo2eDiff(comp.avoidedWeeklyKgCo2e, 1)} kg
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs">
                    <span className="text-muted-foreground">{dict.monthlyLabel}</span>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatSignedCo2eDiff(comp.avoidedMonthlyKgCo2e, 1)} kg
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs">
                    <span className="text-muted-foreground">{dict.annualLabel}</span>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatSignedCo2eDiff(comp.avoidedAnnualKgCo2e, 1)} kg
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {locale === "hi"
                    ? "नोट: ऋणात्मक चिह्न (−) उत्सर्जन में कमी दर्शाता है; धनात्मक (+) उत्सर्जन में वृद्धि दर्शाता है।"
                    : "Sign convention: − denotes estimated emissions avoided vs. baseline; + denotes an emissions increase."}
                </p>

                <div className="h-60 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 12, right: 18, left: 12, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis
                        width={76}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => `${Math.round(v).toLocaleString("en-US")} kg`}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const num = Number(value ?? 0);
                          return [
                            `${num.toLocaleString("en-US", {
                              minimumFractionDigits: horizon === "daily" ? 2 : 1,
                              maximumFractionDigits: horizon === "daily" ? 2 : 1,
                            })} kg CO₂e`,
                            locale === "hi" ? "अनुमानित उत्सर्जन" : "Estimated Emissions",
                          ];
                        }}
                      />
                      <Bar
                        dataKey="emissions"
                        name={
                          locale === "hi"
                            ? "अनुमानित उत्सर्जन (kg CO₂e)"
                            : "Estimated Emissions (kg CO₂e)"
                        }
                        radius={[8, 8, 0, 0]}
                        barSize={68}
                        isAnimationActive={false}
                      >
                        <Cell fill="#94a3b8" />
                        <Cell
                          fill={
                            comp.isNegativeSavings
                              ? "#f43f5e"
                              : comp.avoidedAnnualKgCo2e > 0
                                ? "#10b981"
                                : "#94a3b8"
                          }
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {!comp.boundaryNotice.sameBoundary ? (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {locale === "hi"
                        ? comp.boundaryNotice.summaryHi
                        : comp.boundaryNotice.summaryEn}
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {calculationOutcome.error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expandable Gemini AI Explanation Section ("What does this impact mean?") */}
      <Card className="border-primary/25">
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              <span>{dict.explainTitle}</span>
            </CardTitle>
            <CardDescription>
              {locale === "hi"
                ? "Gemini केवल सत्यापित गणना परिणामों की व्याख्या करता है — कोई नया संख्यात्मक अनुमान नहीं जोड़ता।"
                : "Gemini interprets your verified deterministic numbers alongside current city AQI without altering or fabricating figures."}
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => void explainImpactWithGemini()}
            disabled={aiLoading || !calculationOutcome.ok}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw
              className={`size-4 ${aiLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{dict.explainBtn}</span>
          </Button>
        </CardHeader>

        {aiError ? (
          <CardContent>
            <AiErrorRecoveryCard
              message={aiError.message}
              errorCode={aiError.errorCode}
              onRetry={() => void explainImpactWithGemini()}
              hasFallback={Boolean(aiError.fallback)}
              onUseFallback={
                aiError.fallback
                  ? () => {
                      setAiResult({
                        signature: scenarioSignature,
                        data: aiError.fallback!,
                        aiGenerated: false,
                        citations: [],
                        contextMeta: aiError.contextMeta,
                      });
                      setAiError(null);
                    }
                  : undefined
              }
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

      {/* Expandable Methodology & Documented Emission Factor Registry */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setShowMethodology((s) => !s)}
            aria-expanded={showMethodology}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-base">{dict.methodologyTitle}</CardTitle>
            </div>
            {showMethodology ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>

        {comp && showMethodology ? (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: dict.baselineHeading, res: comp.baseline },
                { label: dict.alternativeHeading, res: comp.alternative },
              ].map(({ label, res }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-muted/25 p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {label}: {locale === "hi" ? res.factor.labelHi : res.factor.labelEn}
                    </span>
                    <Badge variant="outline" className="text-[11px]">
                      {res.factor.factorId} · {res.factor.publicationYear}
                    </Badge>
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-primary">
                    {res.formulaDescription} = {res.dailyKgCo2e.toFixed(3)} {res.factor.gasBasis === "CO2" ? "kg CO₂" : "kg CO₂e"}/day
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <strong>{locale === "hi" ? "आधार" : "Basis"}:</strong> {res.factor.gasBasis}{" "}
                    {res.factor.isDerivedEstimate ? "(derived from CEA grid × vehicle consumption)" : ""} ·{" "}
                    <strong>{locale === "hi" ? "सीमा" : "Range"}:</strong> [{res.factor.uncertaintyRangeKg[0]} –{" "}
                    {res.factor.uncertaintyRangeKg[1]}] {res.factor.unit}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <strong>{locale === "hi" ? "तालिका संदर्भ" : "Source Table"}:</strong>{" "}
                    {res.factor.tableReference}
                  </p>
                  <p className="mt-1 text-muted-foreground">{res.factor.scopeDescription}</p>
                  <a
                    href={res.factor.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>{res.factor.sourceTitle}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="size-4 text-primary" />
                All 12 Documented Modes ({comp.registryVersion})
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(EMISSION_FACTOR_REGISTRY).map((ef) => (
                  <div
                    key={ef.factorId}
                    className="rounded-lg border border-border bg-background/70 p-2.5"
                  >
                    <p className="font-semibold">
                      {locale === "hi" ? ef.labelHi : ef.labelEn}
                    </p>
                    <p className="font-mono text-[11px] text-primary">
                      {ef.numericalFactorKgCo2e} {ef.unit}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {ef.geographicApplicability}
                    </p>
                  </div>
                ))}
              </div>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {comp.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        ) : null}
      </Card>

          {/* Green Activity Progress Tracker */}
          <ActivityTrackerCard
            activeBaselineMode={baselineMode}
            activeAlternativeMode={altMode}
            activeDistanceKm={distanceKm}
            activeOccupancy={clampedAltOcc}
          />
        </>
      ) : (
        <ExposureComparisonCard
          forecast={forecast}
          loadingForecast={loadingForecast}
        />
      )}
    </div>
  );
}
