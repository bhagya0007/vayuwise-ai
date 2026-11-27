"use client";

import { useMemo, useState } from "react";
import { FileText, Printer } from "lucide-react";
import { useAppPreferences } from "@/components/providers/AppProviders";
import {
  REPORT_COPY,
  ReportCurrentConditionsSection,
  ReportDailyPlanSection,
  ReportHeader,
  ReportIndoorAndImpactSections,
  ReportPreferencesSection,
} from "@/components/report/PrintableReportSections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAirQualityForecast } from "@/hooks/useAirQualityForecast";
import {
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  findRelativelyLowerExposureWindows,
} from "@/lib/air-quality/intelligence";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { buildNormalizedPersonalizationContext } from "@/lib/personalization/engine";
import { normalizeLegacyCommuteMode } from "@/lib/personalization/profile-storage";
import type { CommuteMode } from "@/types/domain";

export function PrintableReportView() {
  const { profile, selectedLocation, locale, phase04Dict, activitySummary } =
    useAppPreferences();

  const [includePreferences, setIncludePreferences] = useState(true);
  // Sensitive protection flags stay OFF by default in printable/shared output
  const [includeSensitivity, setIncludeSensitivity] = useState(false);
  const [includeDailyPlan, setIncludeDailyPlan] = useState(true);
  const [includeIndoorChecklist, setIncludeIndoorChecklist] = useState(true);
  const [includeImpact, setIncludeImpact] = useState(true);

  const { activeForecast: forecast } = useAirQualityForecast(selectedLocation, {
    forecastDays: 3,
  });

  const effectiveProfile = useMemo(
    () => ({
      ...profile,
      hasRespiratorySensitivity: includeSensitivity
        ? profile.hasRespiratorySensitivity
        : false,
      sensitivityOptIn: includeSensitivity ? profile.sensitivityOptIn : false,
    }),
    [profile, includeSensitivity]
  );

  const normalized = useMemo(
    () =>
      buildNormalizedPersonalizationContext({
        profile: effectiveProfile,
        location: selectedLocation,
        forecast,
        locale,
      }),
    [effectiveProfile, selectedLocation, forecast, locale]
  );

  const lowerWindow = useMemo(
    () =>
      forecast
        ? findRelativelyLowerExposureWindows(forecast.hourly, 2, 24, {
            timezone: forecast.location.timezone,
            profile: effectiveProfile,
          })
        : null,
    [forecast, effectiveProfile]
  );

  const guidance = useMemo(
    () =>
      forecast
        ? buildRuleBasedGuidance(
            forecast,
            effectiveProfile,
            locale,
            lowerWindow ?? undefined
          )
        : null,
    [forecast, effectiveProfile, locale, lowerWindow]
  );

  const normalizedMode = normalizeLegacyCommuteMode(profile.primaryCommute);
  const baseMode: Exclude<CommuteMode, "walk_cycle"> =
    normalizedMode === "metro_rail" || normalizedMode === "work_from_home"
      ? "car_petrol"
      : normalizedMode;

  const impactComparison = useMemo(
    () =>
      compareTransportScenarios({
        baseline: {
          mode: baseMode,
          roundTripDistanceKm: profile.dailyCommuteKm,
          travelDaysPerWeek: profile.commuteDaysPerWeek ?? 5,
          workingWeeksPerYear: profile.workingWeeksPerYear ?? 48,
          occupancy: profile.vehicleOccupancy ?? 1,
        },
        alternative: {
          mode: "metro_rail",
          roundTripDistanceKm: profile.dailyCommuteKm,
          travelDaysPerWeek: profile.commuteDaysPerWeek ?? 5,
          workingWeeksPerYear: profile.workingWeeksPerYear ?? 48,
        },
      }),
    [baseMode, profile]
  );

  const copy = REPORT_COPY[locale];
  const aqiBand = classifyUsAqi(forecast?.current.usAqi ?? null);
  const dominant = determineDominantPollutant(forecast?.current.subindices);
  const aqiBandLabel = aqiBand.band
    ? locale === "hi"
      ? aqiBand.band.labelHi
      : aqiBand.band.labelEn
    : null;

  const toggleItems = [
    { id: "rep-pref", label: copy.toggles.preferences, checked: includePreferences, onChange: setIncludePreferences },
    { id: "rep-sens", label: copy.toggles.sensitivity, checked: includeSensitivity, onChange: setIncludeSensitivity },
    { id: "rep-plan", label: copy.toggles.dailyPlan, checked: includeDailyPlan, onChange: setIncludeDailyPlan },
    { id: "rep-indoor", label: copy.toggles.indoorChecklist, checked: includeIndoorChecklist, onChange: setIncludeIndoorChecklist },
    { id: "rep-impact", label: copy.toggles.impact, checked: includeImpact, onChange: setIncludeImpact },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-border/80 print:hidden">
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="size-5 text-primary" aria-hidden="true" />
              <span>{copy.pageTitle}</span>
            </CardTitle>
            <CardDescription>{copy.pageSubtitle}</CardDescription>
          </div>
          <Button type="button" onClick={() => window.print()} className="shrink-0 gap-1.5">
            <Printer className="size-4" aria-hidden="true" />
            <span>{copy.printBtn}</span>
          </Button>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {toggleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <Label htmlFor={item.id} className="text-xs font-medium">
                {item.label}
              </Label>
              <Switch
                id={item.id}
                checked={item.checked}
                onCheckedChange={item.onChange}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8 print:border-0 print:p-0">
        <ReportHeader
          selectedLocation={selectedLocation}
          forecast={forecast}
          locale={locale}
          aqiBandLabel={aqiBandLabel}
        />

        {forecast ? (
          <ReportCurrentConditionsSection
            forecast={forecast}
            dominant={dominant}
            lowerWindow={lowerWindow}
            locale={locale}
          />
        ) : null}

        {includePreferences ? (
          <ReportPreferencesSection
            normalized={normalized}
            includeSensitivity={includeSensitivity}
            hasRespiratorySensitivity={profile.hasRespiratorySensitivity}
            locale={locale}
          />
        ) : null}

        {includeDailyPlan && guidance ? (
          <ReportDailyPlanSection guidance={guidance} locale={locale} />
        ) : null}

        <ReportIndoorAndImpactSections
          includeIndoorChecklist={includeIndoorChecklist}
          includeImpact={includeImpact}
          hasHepaPurifier={profile.hasHepaPurifier}
          baseMode={baseMode}
          impactComparison={impactComparison}
          profile={profile}
          activitySummary={activitySummary}
          phase04Dict={phase04Dict}
          locale={locale}
        />
      </article>
    </div>
  );
}
