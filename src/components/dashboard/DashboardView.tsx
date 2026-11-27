"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { ErrorStateCard } from "@/components/common/Controls";
import { DashboardDetailsSection } from "@/components/dashboard/DashboardDetailsSection";
import { DashboardForecastSection } from "@/components/dashboard/DashboardForecastSection";
import { DashboardHeaderCard } from "@/components/dashboard/DashboardHeaderCard";
import {
  DashboardAqiAndGuidanceGrid,
  DashboardFreshnessBar,
} from "@/components/dashboard/DashboardOverviewGrid";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAirQualityForecast } from "@/hooks/useAirQualityForecast";
import {
  buildAirQualityInsights,
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  findRelativelyLowerExposureWindows,
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
      <DashboardFreshnessBar
        activeForecast={activeForecast}
        isDemo={isDemo}
        isStale={isStale}
        freshness={freshness}
        locale={locale}
        dict={dict}
        onReturnToLive={() => reload({ bypassCache: true })}
      />

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
          role="status"
          aria-busy="true"
          aria-label="Loading air quality forecast"
        >
          <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        </div>
      ) : activeForecast ? (
        <>
          <DashboardAqiAndGuidanceGrid
            activeForecast={activeForecast}
            isDemo={isDemo}
            classification={classification}
            dominant={dominant}
            guidance={guidance}
            locale={locale}
            dict={dict}
          />

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
