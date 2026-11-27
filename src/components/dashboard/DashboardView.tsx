"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  ExternalLink,
  FlaskConical,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  DemoNoticeBanner,
  ErrorStateCard,
} from "@/components/common/Controls";
import { AqiGauge } from "@/components/dashboard/AqiGauge";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { LocationSearch } from "@/components/dashboard/LocationSearch";
import { PollutantCard } from "@/components/dashboard/PollutantCard";
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
import {
  buildAirQualityInsights,
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  findRelativelyLowerExposureWindows,
  formatDateTimeInTz,
  formatHourInTz,
  formatWindowRangeInTz,
  POLLUTANT_DISPLAY_META,
  summarizeForecast,
} from "@/lib/air-quality/intelligence";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { formatHouseholdLabel } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type {
  AirQualityForecast,
  GeoLocation,
  PollutantKey,
} from "@/types/domain";

const POLLUTANT_ORDER: readonly PollutantKey[] = [
  "pm25",
  "pm10",
  "no2",
  "o3",
  "so2",
  "co",
] as const;

function getGreetingByHour(
  hour: number | null,
  dict: ReturnType<typeof useAppPreferences>["dict"]
): string {
  if (hour === null) return dict.dashboard.greetingAfternoon;
  if (hour < 12) return dict.dashboard.greetingMorning;
  if (hour < 17) return dict.dashboard.greetingAfternoon;
  return dict.dashboard.greetingEvening;
}

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

  const [forecast, setForecast] = useState<AirQualityForecast | null>(null);
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  const [clientHour, setClientHour] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [demoOverride, setDemoOverride] = useState(false);
  const [horizonHours, setHorizonHours] = useState<24 | 48>(24);
  const [windowHours, setWindowHours] = useState<1 | 2>(2);

  const abortRef = useRef<AbortController | null>(null);
  const activeKey = `${selectedLocation.id}:${selectedLocation.latitude}:${selectedLocation.longitude}`;
  const loading = !demoOverride && fetchedKey !== activeKey && !apiError;

  const fetchForecastAsync = useCallback(
    async (
      loc: GeoLocation,
      locKey: string,
      options: { bypassCache?: boolean; isRefresh?: boolean } = {}
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({
        lat: String(loc.latitude),
        lon: String(loc.longitude),
        name: loc.name,
        country: loc.country,
        countryCode: loc.countryCode,
        timezone: loc.timezone || "auto",
        forecastDays: "3",
      });
      if (loc.region) params.set("region", loc.region);
      if (options.bypassCache) params.set("refresh", "1");

      try {
        const res = await fetch(`/api/air-quality?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as {
          ok: boolean;
          forecast?: AirQualityForecast;
          message?: string;
        };

        if (!res.ok || !body.ok || !body.forecast) {
          setForecast(null);
          setApiError(body.message ?? dict.dashboard.unavailableBody);
          setFetchedKey(locKey);
          return;
        }

        setForecast(body.forecast);
        setApiError(null);
        setFetchedKey(locKey);
        if (options.isRefresh) {
          addToast(dict.dashboard.refreshedToast);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setForecast(null);
          setApiError(dict.dashboard.unavailableBody);
          setFetchedKey(locKey);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [addToast, dict.dashboard.refreshedToast, dict.dashboard.unavailableBody]
  );

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setClientHour(new Date().getHours());
    });
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

    fetch(`/api/air-quality?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = (await res.json()) as {
          ok: boolean;
          forecast?: AirQualityForecast;
          message?: string;
        };
        if (controller.signal.aborted) return;
        if (!res.ok || !body.ok || !body.forecast) {
          setForecast(null);
          setApiError(body.message ?? dict.dashboard.unavailableBody);
          setFetchedKey(activeKey);
          return;
        }
        setForecast(body.forecast);
        setApiError(null);
        setFetchedKey(activeKey);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setForecast(null);
          setApiError(dict.dashboard.unavailableBody);
          setFetchedKey(activeKey);
        }
      });

    return () => {
      window.cancelAnimationFrame(rafId);
      controller.abort();
      abortRef.current?.abort();
    };
  }, [selectedLocation, activeKey, dict.dashboard.unavailableBody]);

  const loadForecast = (
    loc: GeoLocation,
    options: { bypassCache?: boolean; isRefresh?: boolean } = {}
  ) => {
    const locKey = `${loc.id}:${loc.latitude}:${loc.longitude}`;
    if (options.isRefresh) {
      setRefreshing(true);
    }
    setApiError(null);
    setDemoOverride(false);
    void fetchForecastAsync(loc, locKey, options);
  };

  const activeForecast: AirQualityForecast | null = useMemo(() => {
    if (demoOverride) {
      return {
        ...getDemoForecast(selectedLocation.id),
        location: selectedLocation,
      };
    }
    return forecast;
  }, [demoOverride, forecast, selectedLocation]);

  const handleSelectLocation = (
    loc: GeoLocation,
    options?: { persistPreference?: boolean }
  ) => {
    setApiError(null);
    setDemoOverride(false);
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

  const handleEnableDemo = () => {
    setDemoOverride(true);
    setApiError(null);
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
      {/* Data Provenance & Demo / Stale Status Banner */}
      {isDemo ? (
        <div className="space-y-2">
          <DemoNoticeBanner />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void loadForecast(selectedLocation, { bypassCache: true })}
            >
              {dict.dashboard.returnToLiveLabel}
            </Button>
          </div>
        </div>
      ) : activeForecast ? (
        <div
          role="status"
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

      {/* Compact Command-Center Header & Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
        <div className="flex flex-col justify-between gap-2.5 md:flex-row md:items-center">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">
              {getGreetingByHour(clientHour, dict)} · {dict.dashboard.preparedFor}{" "}
              <span className="text-foreground">{householdSummary}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {selectedLocation.name}
              </h1>
              <Badge variant="outline" className="gap-1">
                <MapPin className="size-3 text-primary" aria-hidden="true" />
                {[selectedLocation.region, selectedLocation.country]
                  .filter(Boolean)
                  .join(", ")}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!profile.onboardingCompleted ? (
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "gap-1.5"
                )}
              >
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                <span>
                  {locale === "hi" ? "प्रोफ़ाइल सेट करें" : "Personalize"}
                </span>
              </Link>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void loadForecast(selectedLocation, {
                  bypassCache: true,
                  isRefresh: true,
                })
              }
              disabled={refreshing || loading}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("size-3.5", (refreshing || loading) && "animate-spin")}
                aria-hidden="true"
              />
              <span>{dict.dashboard.refreshLabel}</span>
            </Button>
          </div>
        </div>

        <LocationSearch onSelectLocation={handleSelectLocation} />
      </div>

      {/* Honest Unavailable State when live API fails and no cache exists */}
      {apiError && !activeForecast ? (
        <div className="space-y-3">
          <ErrorStateCard
            title={dict.dashboard.unavailableTitle}
            description={apiError}
            onRetry={() =>
              void loadForecast(selectedLocation, { bypassCache: true })
            }
            retryLabel={dict.dashboard.retryLabel}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-xs">
            <p className="text-muted-foreground">
              Need to inspect the interface offline? Switch explicitly to clearly labeled demonstration data.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEnableDemo}
              className="gap-1.5"
            >
              <FlaskConical className="size-3.5" aria-hidden="true" />
              <span>{dict.dashboard.switchToDemoLabel}</span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Main Bento Grid: AQI Gauge + Rule-Based Intelligence Hero Card */}
      {loading && !activeForecast ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        </div>
      ) : activeForecast ? (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Semicircular AQI Gauge Card */}
            <Card className="lg:col-span-5">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {isDemo ? "US AQI (Demonstration)" : dict.dashboard.usAqiTitle}
                  </CardTitle>
                  {classification.band ? (
                    <Badge variant="outline" className={classification.band.badgeClass}>
                      {locale === "hi"
                        ? classification.band.labelHi
                        : classification.band.labelEn}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unavailable</Badge>
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
                    : "Current US AQI value is unavailable from the model."}
                </p>

                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
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
                </div>
              </CardContent>
            </Card>

            {/* Rule-Based Intelligence Hero Card */}
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
                        {locale === "hi" ? "यह सलाह क्यों और अपेक्षित लाभ" : "Why this helps & expected benefit"}
                      </summary>
                      <div className="mt-2 space-y-1.5 text-muted-foreground">
                        <p>{guidance.whyItMatters}</p>
                        <p className="text-foreground/90">{guidance.expectedQualitativeBenefit}</p>
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

          {/* 4 Primary Quick Actions */}
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

          {/* Forecast Chart + Lower-Exposure Window Bento */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">
                  {dict.dashboard.forecastTitle}
                </CardTitle>
                <CardDescription>
                  {dict.dashboard.forecastSubtitle}
                  {summary.availableHours < horizonHours
                    ? locale === "hi"
                      ? ` (${horizonHours}h में से ${summary.availableHours} वैध घंटे उपलब्ध)`
                      : ` (Showing ${summary.availableHours} valid forecast hours of ${horizonHours}h requested)`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ForecastChart
                  hourly={activeForecast.hourly}
                  timezone={activeForecast.location.timezone}
                  horizonHours={horizonHours}
                  onHorizonChange={setHorizonHours}
                  loading={refreshing}
                  emptyMessage="Hourly forecast data is unavailable for this location."
                  currentTimeIso={activeForecast.current.timestampIso}
                />

                {/* Forecast Summary Strip */}
                <div className="grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      {dict.dashboard.lowestLabel}
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {summary.lowestPoint
                        ? `${summary.lowestPoint.usAqi} (${formatHourInTz(
                            summary.lowestPoint.timestampIso,
                            activeForecast.location.timezone
                          )})`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      {dict.dashboard.highestLabel}
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {summary.highestPoint
                        ? `${summary.highestPoint.usAqi} (${formatHourInTz(
                            summary.highestPoint.timestampIso,
                            activeForecast.location.timezone
                          )})`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      {dict.dashboard.validHoursLabel}
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {summary.availableHours}h
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      {dict.dashboard.unhealthyHoursLabel}
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {summary.unhealthyOrWorseHours}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relatively Lower-Exposure Window Panel */}
            <Card className="flex flex-col justify-between lg:col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {dict.dashboard.lowerWindowTitle}
                  </CardTitle>
                  <Clock className="size-4 text-primary" aria-hidden="true" />
                </div>
                <CardDescription>
                  {dict.dashboard.lowerWindowCautionNote}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-1.5" role="group" aria-label="Window duration">
                  {([1, 2] as const).map((w) => (
                    <Button
                      key={w}
                      type="button"
                      size="xs"
                      variant={windowHours === w ? "default" : "outline"}
                      onClick={() => setWindowHours(w)}
                    >
                      {w === 1 ? dict.dashboard.window1h : dict.dashboard.window2h}
                    </Button>
                  ))}
                </div>

                {lowerWindow.available && lowerWindow.bestWindow ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-primary/30 bg-primary/8 p-3.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {locale === "hi"
                          ? `पूर्वानुमान न्यूनतम (${windowHours}h औसत)`
                          : `Forecast Lowest (${windowHours}h Avg)`}
                      </p>
                      <p className="mt-1 font-mono text-base font-semibold text-primary">
                        {formatWindowRangeInTz(
                          lowerWindow.bestWindow.startIso,
                          lowerWindow.bestWindow.endIso,
                          activeForecast.location.timezone
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground">
                        Avg US AQI:{" "}
                        <span className="font-mono font-semibold">
                          {lowerWindow.bestWindow.averageUsAqi}
                        </span>
                        {lowerWindow.peakWindow ? (
                          <span className="text-muted-foreground">
                            {" "}
                            vs. peak {lowerWindow.peakWindow.averageUsAqi} at{" "}
                            {formatHourInTz(
                              lowerWindow.peakWindow.startIso,
                              activeForecast.location.timezone
                            )}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/35 p-3 text-xs">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {locale === "hi"
                          ? "व्यावहारिक दिन की गतिविधि समय"
                          : "Practical Daytime Window (07:00–20:00)"}
                      </p>
                      {lowerWindow.practicalWindow ? (
                        <p className="mt-1 font-medium text-foreground">
                          {formatWindowRangeInTz(
                            lowerWindow.practicalWindow.startIso,
                            lowerWindow.practicalWindow.endIso,
                            activeForecast.location.timezone
                          )}{" "}
                          <span className="font-mono text-muted-foreground">
                            (~{lowerWindow.practicalWindow.averageUsAqi} AQI)
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 font-medium text-amber-700 dark:text-amber-300">
                          {locale === "hi"
                            ? "दिन में सुरक्षित कम-AQI अवधि नहीं — गैर-जरूरी काम टालें या इनडोर विकल्प चुनें"
                            : "No low-AQI daytime window — postpone non-essential trips or stay indoors"}
                        </p>
                      )}
                    </div>

                    <details className="rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer select-none font-medium text-foreground">
                        {locale === "hi" ? "समय नोट्स और सीमाएं" : "Window notes & limitations"}
                      </summary>
                      <div className="mt-2 space-y-2">
                        <p>
                          {locale === "hi"
                            ? lowerWindow.practicalWindowNoteHi
                            : lowerWindow.practicalWindowNoteEn}
                        </p>
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                          <AlertTriangle
                            className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                            aria-hidden="true"
                          />
                          <p>
                            {locale === "hi"
                              ? lowerWindow.cautionHi
                              : lowerWindow.cautionEn}
                          </p>
                        </div>
                        <p>
                          {locale === "hi"
                            ? lowerWindow.limitationNoteHi
                            : lowerWindow.limitationNoteEn}
                        </p>
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {locale === "hi"
                      ? lowerWindow.cautionHi
                      : lowerWindow.cautionEn}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Priority Recommendations */}
          {guidance ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {dict.dashboard.recommendationsTitle}
                </h2>
                {activitySummary.totalRecords > 0 ? (
                  <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                    {activitySummary.totalRecords}{" "}
                    {locale === "hi" ? "पूर्ण कार्य" : "actions logged"} ·{" "}
                    {activitySummary.weeklySavingsKgCo2e.toFixed(1)} kg CO₂e
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {guidance.items.slice(0, 3).map((item) => (
                  <Card key={item.id} size="sm">
                    <CardHeader className="pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{item.title}</CardTitle>
                        <Badge
                          variant={
                            item.priority === "protective"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {item.priority === "protective"
                            ? "Protective"
                            : "Advisory"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <p className="leading-relaxed text-foreground">
                        {item.action}
                      </p>
                      <details className="text-muted-foreground">
                        <summary className="cursor-pointer select-none font-medium text-foreground/80">
                          {locale === "hi" ? "क्यों?" : "Why?"}
                        </summary>
                        <p className="mt-1 leading-relaxed">{item.rationale}</p>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* Progressive Disclosure Accordions for Technical Details */}
          <div className="space-y-3">
            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-foreground sm:text-base">
                {dict.dashboard.pollutantsTitle}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (PM₂.₅, PM₁₀, NO₂, SO₂, O₃, CO)
                </span>
              </summary>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {POLLUTANT_ORDER.map((key) => {
                  const meta = POLLUTANT_DISPLAY_META[key];
                  const series = activeForecast.hourly
                    .slice(0, 24)
                    .map((pt) => pt.pollutants[key])
                    .filter((v): v is number => v !== null && Number.isFinite(v));

                  return (
                    <PollutantCard
                      key={key}
                      symbol={meta.symbol}
                      name={locale === "hi" ? meta.nameHi : meta.nameEn}
                      value={activeForecast.current.pollutants[key]}
                      unit={activeForecast.units?.[key] ?? meta.defaultUnit}
                      description={
                        locale === "hi" ? meta.descriptionHi : meta.descriptionEn
                      }
                      sparklineValues={series}
                    />
                  );
                })}
              </div>
            </details>

            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-foreground sm:text-base">
                {dict.dashboard.insightsTitle}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {locale === "hi" ? "अतिरिक्त विश्लेषण व स्वास्थ्य स्रोत" : "Trends, extra tips & health sources"}
                </span>
              </summary>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {insights.map((insight) => (
                    <Card key={insight.id} size="sm">
                      <CardHeader className="pb-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {insight.label}
                        </p>
                        <CardTitle className="text-sm font-semibold">
                          {insight.value}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {insight.detail}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {guidance && guidance.items.length > 3 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {guidance.items.slice(3).map((item) => (
                      <Card key={item.id} size="sm">
                        <CardHeader className="pb-1">
                          <CardTitle className="text-sm">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-xs">
                          <p className="text-foreground">{item.action}</p>
                          <p className="text-muted-foreground">{item.rationale}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}

                {guidance ? (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {guidance.references.map((ref) => (
                      <a
                        key={ref.url}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <span>{ref.label}</span>
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </div>

          {guidance ? (
            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              {guidance.medicalDisclaimer}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
