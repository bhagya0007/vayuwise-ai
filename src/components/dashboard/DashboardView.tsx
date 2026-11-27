"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  DemoNoticeBanner,
  ErrorStateCard,
} from "@/components/common/Controls";
import { AqiGauge } from "@/components/dashboard/AqiGauge";
import { DashboardDetailsSection } from "@/components/dashboard/DashboardDetailsSection";
import { DashboardForecastSection } from "@/components/dashboard/DashboardForecastSection";
import { DashboardHeaderCard } from "@/components/dashboard/DashboardHeaderCard";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAirQualityForecast } from "@/hooks/useAirQualityForecast";
import {
  buildAirQualityInsights,
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  findRelativelyLowerExposureWindows,
  formatDateTimeInTz,
  formatHourInTz,
  summarizeForecast,
} from "@/lib/air-quality/intelligence";
import { formatHouseholdLabel } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type { GeoLocation } from "@/types/domain";

function getGreetingByHour(
  hour: number | null,
  dict: ReturnType<typeof useAppPreferences>["dict"]
): string {
  if (hour === null) return dict.dashboard.greetingAfternoon;
  if (hour < 12) return dict.dashboard.greetingMorning;
  if (hour < 17) return dict.dashboard.greetingAfternoon;
  return dict.dashboard.greetingEvening;
}

/**
 * Urban air-quality command center composing modeled AQI telemetry,
 * rule-based health protection, 24h/48h dispersion outlooks, and deep-links.
 */
export function DashboardView() {
  const {
    locale,
    dict,
    selectedLocation,
    selectLocation,
    profile,
    activitySummary,
    addToast,
  } = useAppPreferences();

  const [clientHour, setClientHour] = useState<number | null>(null);
  const [horizonHours, setHorizonHours] = useState<24 | 48>(24);
  const [windowHours, setWindowHours] = useState<1 | 2>(2);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setClientHour(new Date().getHours());
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const handleRefreshedToast = useCallback(() => {
    addToast(dict.dashboard.refreshedToast);
  }, [addToast, dict.dashboard.refreshedToast]);

  const {
    activeForecast,
    loading,
    refreshing,
    apiError,
    reload,
    enableDemoMode,
    clearOverridesForLocationSwitch,
  } = useAirQualityForecast(selectedLocation, {
    forecastDays: 3,
    unavailableFallbackMessage: dict.dashboard.unavailableBody,
    onRefreshed: handleRefreshedToast,
  });

  const handleSelectLocation = (
    loc: GeoLocation,
    options?: { persistPreference?: boolean }
  ) => {
    clearOverridesForLocationSwitch();
    selectLocation(loc, options);
    if (options?.persistPreference !== false) {
      addToast(
        locale === "hi"
          ? `चयनित स्थान: ${loc.name}`
          : `Selected location: ${loc.name}`,
        "info"
      );
    }
  };

  const classification = classifyUsAqi(activeForecast?.current.usAqi);
  const dominant = determineDominantPollutant(activeForecast?.current.subindices);
  const summary = useMemo(
    () => summarizeForecast(activeForecast?.hourly ?? [], horizonHours),
    [activeForecast?.hourly, horizonHours]
  );
  const lowerWindow = useMemo(
    () =>
      findRelativelyLowerExposureWindows(
        activeForecast?.hourly ?? [],
        windowHours,
        horizonHours,
        { timezone: activeForecast?.location.timezone, profile }
      ),
    [activeForecast?.hourly, activeForecast?.location, windowHours, horizonHours, profile]
  );
  const guidance = useMemo(
    () =>
      activeForecast
        ? buildRuleBasedGuidance(activeForecast, profile, locale, lowerWindow)
        : null,
    [activeForecast, profile, locale, lowerWindow]
  );
  const insights = useMemo(
    () =>
      activeForecast && guidance
        ? buildAirQualityInsights(
            activeForecast,
            summary,
            lowerWindow,
            guidance,
            dominant,
            locale
          )
        : [],
    [activeForecast, summary, lowerWindow, guidance, dominant, locale]
  );

  const freshness = activeForecast?.provenance.freshnessStatus ?? "unavailable";
  const isDemo = activeForecast?.provenance.dataSourceType === "demonstration";
  const isStale = Boolean(activeForecast?.provenance.isStale && !isDemo);
  const householdSummary = formatHouseholdLabel(
    profile.householdAdults,
    profile.childrenCount,
    profile.seniorsCount,
    locale
  );

  return (
    <div className="space-y-6">
      {isDemo ? (
        <div className="space-y-2">
          <DemoNoticeBanner />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => reload({ bypassCache: true })}
            >
              {dict.dashboard.returnToLiveLabel}
            </Button>
          </div>
        </div>
      ) : activeForecast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs",
            isStale
              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
          )}
        >
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span
              className={cn(
                "size-2 rounded-full",
                isStale ? "bg-amber-500" : "bg-emerald-500"
              )}
              aria-hidden="true"
            />
            <span>{dict.dashboard.freshnessLabels[freshness]}</span>
          </div>
          <details className="text-[11px] opacity-90">
            <summary className="cursor-pointer select-none font-medium hover:underline">
              {locale === "hi" ? "डेटा विवरण" : "Data timestamp & source"}
            </summary>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
              <span>
                {dict.dashboard.modelTimestamp}:{" "}
                {formatDateTimeInTz(
                  activeForecast.provenance.modelTimestampIso ??
                    activeForecast.current.timestampIso,
                  activeForecast.location.timezone
                )}
              </span>
              <span>
                {dict.dashboard.fetchedAt}:{" "}
                {formatHourInTz(
                  activeForecast.provenance.fetchedAtIso,
                  activeForecast.location.timezone
                )}{" "}
                ({activeForecast.location.timezone})
              </span>
            </div>
          </details>
        </div>
      ) : null}

      <DashboardHeaderCard
        greeting={getGreetingByHour(clientHour, dict)}
        householdSummary={householdSummary}
        selectedLocation={selectedLocation}
        onboardingCompleted={profile.onboardingCompleted}
        refreshing={refreshing}
        loading={loading}
        locale={locale}
        dict={dict}
        onRefresh={() => reload({ bypassCache: true, isRefresh: true })}
        onSelectLocation={handleSelectLocation}
      />

      {apiError && !activeForecast ? (
        <div className="space-y-3" role="alert">
          <ErrorStateCard
            title={dict.dashboard.unavailableTitle}
            description={apiError}
            onRetry={() => reload({ bypassCache: true })}
            retryLabel={dict.dashboard.retryLabel}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-xs">
            <p className="text-muted-foreground">
              {locale === "hi"
                ? "ऑफ़लाइन इंटरफ़ेस देखने के लिए स्पष्ट लेबल वाले डेमो डेटा पर स्विच करें।"
                : "Need to inspect the interface offline? Switch explicitly to clearly labeled demonstration data."}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={enableDemoMode}
              className="gap-1.5"
            >
              <FlaskConical className="size-3.5" aria-hidden="true" />
              <span>{dict.dashboard.switchToDemoLabel}</span>
            </Button>
          </div>
        </div>
      ) : null}

      {loading && !activeForecast ? (
        <div
          className="grid grid-cols-1 gap-5 lg:grid-cols-12"
          aria-busy="true"
          aria-label="Loading air quality forecast"
        >
          <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        </div>
      ) : activeForecast ? (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {isDemo
                      ? locale === "hi"
                        ? "US AQI (डेमो डेटा)"
                        : "US AQI (Demonstration)"
                      : dict.dashboard.usAqiTitle}
                  </CardTitle>
                  {classification.band ? (
                    <Badge variant="outline" className={classification.band.badgeClass}>
                      {locale === "hi"
                        ? classification.band.labelHi
                        : classification.band.labelEn}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {locale === "hi" ? "अनुपलब्ध" : "Unavailable"}
                    </Badge>
                  )}
                </div>
                <CardDescription>{dict.dashboard.usAqiNote}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <AqiGauge
                  usAqi={activeForecast.current.usAqi}
                  dominantPollutant={dominant.dominantPollutant}
                  dominantReason={
                    locale === "hi" ? dominant.reasonHi : dominant.reasonEn
                  }
                  locale={locale}
                />

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {classification.band
                    ? locale === "hi"
                      ? classification.band.descriptionHi
                      : classification.band.descriptionEn
                    : locale === "hi"
                      ? "मॉडल से वर्तमान US AQI मान उपलब्ध नहीं है।"
                      : "Current US AQI value is unavailable from the model."}
                </p>

                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  {locale === "hi" ? (
                    <>
                      <a
                        href="https://open-meteo.com/en/docs/air-quality-api"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Open-Meteo / CAMS
                      </a>{" "}
                      द्वारा क्षेत्रीय मॉडल्ड अनुमान; सड़क-स्तरीय ट्रैफ़िक प्रदूषण भिन्न हो सकता है।
                    </>
                  ) : (
                    <>
                      Regional modeled estimates via{" "}
                      <a
                        href="https://open-meteo.com/en/docs/air-quality-api"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Open-Meteo / CAMS
                      </a>
                      ; street-level traffic exposure can differ.
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {guidance ? (
              <Card className="flex flex-col lg:col-span-7">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-primary/35 bg-primary/10 text-primary"
                    >
                      <Sparkles className="size-3" aria-hidden="true" />
                      {locale === "hi"
                        ? "नियम-आधारित स्वास्थ्य मार्गदर्शन · AI तैयार"
                        : "Rule-Based Intelligence · AI Ready"}
                    </Badge>
                    {guidance.healthProtectionPriority ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      >
                        <ShieldAlert className="size-3" aria-hidden="true" />
                        {locale === "hi" ? "स्वास्थ्य प्राथमिकता" : "Health Priority"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        {locale === "hi" ? "मानक सलाह" : "Standard Advisory"}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="pt-1 text-lg sm:text-xl">
                    {guidance.headline}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-border bg-muted/35 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {locale === "hi" ? "आज का मुख्य कदम" : "Top Recommendation"}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground">
                        {guidance.recommendedPrimaryAction}
                      </p>
                    </div>

                    <ul className="space-y-1.5 px-0.5 text-xs text-muted-foreground">
                      {guidance.items.slice(0, 3).map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          <span>
                            <strong className="font-medium text-foreground">
                              {item.title}:
                            </strong>{" "}
                            {item.action}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <details className="rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-xs">
                      <summary className="cursor-pointer select-none font-medium text-foreground">
                        {locale === "hi"
                          ? "यह सलाह क्यों और अपेक्षित लाभ"
                          : "Why this helps & expected benefit"}
                      </summary>
                      <div className="mt-2 space-y-1.5 text-muted-foreground">
                        <p>{guidance.whyItMatters}</p>
                        <p className="text-foreground/90">
                          {guidance.expectedQualitativeBenefit}
                        </p>
                      </div>
                    </details>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href="/planner"
                        className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
                      >
                        <span>
                          {locale === "hi" ? "आज की योजना बनाएं" : "Plan my day"}
                        </span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                      <Link
                        href="/assistant"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1.5"
                        )}
                      >
                        <span>{locale === "hi" ? "Vayu AI से पूछें" : "Ask Vayu AI"}</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {dict.dashboard.quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 justify-between rounded-xl px-3.5 text-xs font-medium sm:text-sm"
                )}
              >
                <span className="truncate">{action.label}</span>
                <ArrowRight
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>

          <DashboardForecastSection
            activeForecast={activeForecast}
            summary={summary}
            lowerWindow={lowerWindow}
            horizonHours={horizonHours}
            onHorizonChange={setHorizonHours}
            windowHours={windowHours}
            onWindowHoursChange={setWindowHours}
            refreshing={refreshing}
            locale={locale}
            dict={dict}
          />

          <DashboardDetailsSection
            activeForecast={activeForecast}
            guidance={guidance}
            insights={insights}
            activitySummary={activitySummary}
            locale={locale}
            dict={dict}
          />
        </>
      ) : null}
    </div>
  );
}
