"use client";

import { useMemo, useState } from "react";
import { FileText, Printer, ShieldAlert } from "lucide-react";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { useAirQualityForecast } from "@/hooks/useAirQualityForecast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { VERIFIED_KNOWLEDGE_REGISTRY } from "@/lib/ai/knowledge-registry";
import {
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  findRelativelyLowerExposureWindows,
  formatDateTimeInTz,
  formatHourInTz,
  POLLUTANT_DISPLAY_META,
} from "@/lib/air-quality/intelligence";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { buildNormalizedPersonalizationContext } from "@/lib/personalization/engine";
import { normalizeLegacyCommuteMode } from "@/lib/personalization/profile-storage";
import type { CommuteMode } from "@/types/domain";

export function PrintableReportView() {
  const {
    profile,
    selectedLocation,
    locale,
    phase04Dict,
    activitySummary,
  } = useAppPreferences();

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
        ? findRelativelyLowerExposureWindows(forecast.hourly, 2, 24)
        : null,
    [forecast]
  );

  const guidance = useMemo(
    () =>
      forecast
        ? buildRuleBasedGuidance(forecast, effectiveProfile, locale, lowerWindow ?? undefined)
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

  const aqiBand = classifyUsAqi(forecast?.current.usAqi ?? null);
  const dominant = determineDominantPollutant(forecast?.current.subindices);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Screen-only Configuration Bar */}
      <Card className="print:hidden border-border/80">
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="size-5 text-primary" aria-hidden="true" />
              <span>
                {locale === "hi"
                  ? "प्रिंट करने योग्य व्यक्तिगत वायु रिपोर्ट"
                  : "Printable Personalized Air Quality Report"}
              </span>
            </CardTitle>
            <CardDescription>
              {locale === "hi"
                ? "चुनें कि रिपोर्ट या PDF में क्या शामिल करना है। संवेदनशीलता प्राथमिकता डिफ़ॉल्ट रूप से बाहर रखी जाती है।"
                : "Select what to include before printing or saving as PDF. Optional respiratory sensitivity details are excluded by default."}
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => window.print()}
            className="gap-1.5 shrink-0"
          >
            <Printer className="size-4" aria-hidden="true" />
            <span>
              {locale === "hi" ? "प्रिंट / PDF सहेजें" : "Print / Save as PDF"}
            </span>
          </Button>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: "rep-pref",
              label: locale === "hi" ? "प्रोफ़ाइल प्राथमिकताएँ शामिल करें" : "Include Profile Summary",
              checked: includePreferences,
              onChange: setIncludePreferences,
            },
            {
              id: "rep-sens",
              label: locale === "hi" ? "संवेदनशीलता प्राथमिकता शामिल करें (वैकल्पिक)" : "Include Optional Sensitivity Note",
              checked: includeSensitivity,
              onChange: setIncludeSensitivity,
            },
            {
              id: "rep-plan",
              label: locale === "hi" ? "दैनिक कार्य योजना शामिल करें" : "Include Daily Action Plan",
              checked: includeDailyPlan,
              onChange: setIncludeDailyPlan,
            },
            {
              id: "rep-indoor",
              label: locale === "hi" ? "इनडोर वायु चेकलिस्ट शामिल करें" : "Include Indoor Air Checklist",
              checked: includeIndoorChecklist,
              onChange: setIncludeIndoorChecklist,
            },
            {
              id: "rep-impact",
              label: locale === "hi" ? "पर्यावरणीय प्रभाव व विकल्प शामिल करें" : "Include Impact & Sustainable Swaps",
              checked: includeImpact,
              onChange: setIncludeImpact,
            },
          ].map((item) => (
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

      {/* A4 Printable Sheet */}
      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              VayuWise AI · Breathe Smarter. Live Greener.
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {selectedLocation.name}
              {selectedLocation.region ? `, ${selectedLocation.region}` : ""} —{" "}
              {locale === "hi" ? "एयर क्वालिटी व एक्शन रिपोर्ट" : "Smog & Action Brief"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {forecast
                ? `Source: ${forecast.provenance.sourceName} (${forecast.provenance.dataSourceType}) · Standard: ${forecast.provenance.aqiStandard} (distinct from official India CPCB NAQI) · Model time: ${formatDateTimeInTz(
                    forecast.provenance.modelTimestampIso ??
                      forecast.current.timestampIso,
                    forecast.location.timezone
                  )}`
                : "Forecast unavailable — ensure internet connectivity and refresh before relying on readings."}
            </p>
          </div>
          {forecast && aqiBand.band ? (
            <Badge variant="outline" className="text-sm font-semibold">
              US AQI {Math.round(forecast.current.usAqi ?? 0)} ·{" "}
              {locale === "hi" ? aqiBand.band.labelHi : aqiBand.band.labelEn}
            </Badge>
          ) : null}
        </header>

        {/* Current Conditions */}
        {forecast ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold">
              {locale === "hi" ? "1. वर्तमान मॉडल्ड वायु स्थिति" : "1. Current Modeled Conditions"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {dominant.reliable && dominant.dominantPollutant
                ? `${locale === "hi" ? "प्रमुख प्रदूषक" : "Dominant pollutant"}: ${POLLUTANT_DISPLAY_META[dominant.dominantPollutant].symbol} (subindex ${dominant.subindexValue})`
                : locale === "hi"
                  ? dominant.reasonHi
                  : dominant.reasonEn}
              {lowerWindow?.available && lowerWindow.bestWindow
                ? ` · ${locale === "hi" ? "अपेक्षाकृत कम-AQI अवधि" : "Relatively lower-AQI 2h window"}: ${formatHourInTz(
                    lowerWindow.bestWindow.startIso,
                    forecast.location.timezone
                  )}–${formatHourInTz(
                    lowerWindow.bestWindow.endIso,
                    forecast.location.timezone
                  )} (avg ${lowerWindow.bestWindow.averageUsAqi})`
                : ""}
            </p>
          </section>
        ) : null}

        {/* Selected Non-Sensitive Preferences */}
        {includePreferences ? (
          <section className="space-y-2 border-t border-border/60 pt-4">
            <h2 className="text-base font-semibold">
              {locale === "hi" ? "2. शामिल जीवनशैली प्राथमिकताएँ" : "2. Included Household & Commute Setup"}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {normalized.appliedPreferenceLabels.map((lbl) => (
                <Badge key={lbl} variant="secondary" className="text-xs font-normal">
                  {lbl}
                </Badge>
              ))}
              {includeSensitivity && profile.hasRespiratorySensitivity ? (
                <Badge variant="outline" className="text-xs">
                  {locale === "hi"
                    ? "वैकल्पिक सुरक्षा प्राथमिकता सक्षम"
                    : "Optional respiratory protection priority included"}
                </Badge>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Daily Plan Guidance */}
        {includeDailyPlan && guidance ? (
          <section className="space-y-2 border-t border-border/60 pt-4">
            <h2 className="text-base font-semibold">
              {locale === "hi" ? "3. दैनिक स्वास्थ्य-प्रथम योजना" : "3. Personalized Daily Protection Plan"}
            </h2>
            <p className="text-sm font-medium">{guidance.headline}</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
              {guidance.items.map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{item.action}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Indoor Air Checklist */}
        {includeIndoorChecklist ? (
          <section className="space-y-2 border-t border-border/60 pt-4">
            <h2 className="text-base font-semibold">
              {locale === "hi" ? "4. इनडोर वायु सुरक्षा चेकलिस्ट" : "4. Indoor Air Protection Checklist"}
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>
                {locale === "hi"
                  ? "खाना पकाते समय चिमनी/एग्जॉस्ट चलाएं और बर्तन ढककर रखें।"
                  : "Operate kitchen exhaust and cover cooking pans to trap cooking aerosols."}
              </li>
              <li>
                {locale === "hi"
                  ? "सूखी झाड़ू के बजाय गीला पोंछा लगाएं।"
                  : "Damp-mop hard floors instead of dry sweeping."}
              </li>
              <li>
                {profile.hasHepaPurifier
                  ? locale === "hi"
                    ? "सोने से पहले बंद कमरे में HEPA प्यूरीफ़ायर चलाएं।"
                    : "Run HEPA air cleaner in closed sleeping quarters."
                  : locale === "hi"
                    ? "बिना HEPA के कमरे के दरवाजे-खिड़की की दरारें सील रखें और अगरबत्ती/धुएं से बचें।"
                    : "Without HEPA, focus on zero indoor combustion (no incense/coils) and sealing window drafts."}
              </li>
            </ul>
          </section>
        ) : null}

        {/* Deterministic Impact & Tracked Progress */}
        {includeImpact ? (
          <section className="space-y-2 border-t border-border/60 pt-4">
            <h2 className="text-base font-semibold">
              {locale === "hi"
                ? "5. नियतात्मक यात्रा उत्सर्जन तुलना"
                : "5. Deterministic Commute Emissions Comparison"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {phase04Dict.commuteModes[baseMode]} ({impactComparison.baseline.annualKgCo2e.toFixed(1)}{" "}
              kg/yr) vs {phase04Dict.commuteModes.metro_rail} (
              {impactComparison.alternative.annualKgCo2e.toFixed(1)} kg/yr) at{" "}
              {profile.dailyCommuteKm} km/day × {profile.commuteDaysPerWeek ?? 5} days/wk:{" "}
              <strong>{impactComparison.percentageNote}</strong>
            </p>
            {activitySummary.totalRecords > 0 ? (
              <p className="text-xs text-muted-foreground">
                Logged completed actions: {activitySummary.totalRecords} (Achieved last 30 days:{" "}
                {activitySummary.monthlySavingsKgCo2e.toFixed(2)} kg CO₂e).
              </p>
            ) : null}
          </section>
        ) : null}

        {/* References & Limitations Footer */}
        <footer className="space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
          <p className="flex items-start gap-1.5 font-medium text-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            <span>
              {locale === "hi"
                ? "यह रिपोर्ट केवल पर्यावरणीय जानकारी हेतु है, चिकित्सीय सलाह नहीं। CO2e बचत स्थानीय AQI या रोग जोखिम में मापी गई कमी नहीं दर्शाती।"
                : "Informational guidance only — not clinical medical advice. Operational CO2e estimates are strictly separate from local ambient PM2.5 inhalation or health-risk reduction."}
            </span>
          </p>
          <p>
            <strong>Verified References:</strong>{" "}
            {Object.values(VERIFIED_KNOWLEDGE_REGISTRY)
              .map((s) => `${s.title} (${s.organization})`)
              .join(" · ")}
          </p>
        </footer>
      </article>
    </div>
  );
}
