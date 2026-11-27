"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatHourInTz,
  formatWindowRangeInTz,
  type ForecastSummary,
  type LowerExposureWindowResult,
} from "@/lib/air-quality/intelligence";
import type { AppDictionary } from "@/lib/i18n/dictionary";
import type { AirQualityForecast, Locale } from "@/types/domain";

interface DashboardForecastSectionProps {
  activeForecast: AirQualityForecast;
  summary: ForecastSummary;
  lowerWindow: LowerExposureWindowResult;
  horizonHours: 24 | 48;
  onHorizonChange: (hours: 24 | 48) => void;
  windowHours: 1 | 2;
  onWindowHoursChange: (hours: 1 | 2) => void;
  refreshing: boolean;
  locale: Locale;
  dict: AppDictionary;
}

/**
 * Renders the modeled 24h/48h pollution forecast chart, summary statistics,
 * and practical daytime lower-exposure window guidance.
 */
export function DashboardForecastSection({
  activeForecast,
  summary,
  lowerWindow,
  horizonHours,
  onHorizonChange,
  windowHours,
  onWindowHoursChange,
  refreshing,
  locale,
  dict,
}: DashboardForecastSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle className="text-base">{dict.dashboard.forecastTitle}</CardTitle>
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
            onHorizonChange={onHorizonChange}
            loading={refreshing}
            emptyMessage={
              locale === "hi"
                ? "इस स्थान के लिए प्रति-घंटा पूर्वानुमान डेटा अनुपलब्ध है।"
                : "Hourly forecast data is unavailable for this location."
            }
            currentTimeIso={activeForecast.current.timestampIso}
          />

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

      <Card className="flex flex-col justify-between lg:col-span-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {dict.dashboard.lowerWindowTitle}
            </CardTitle>
            <Clock className="size-4 text-primary" aria-hidden="true" />
          </div>
          <CardDescription>{dict.dashboard.lowerWindowCautionNote}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-1.5" role="group" aria-label="Window duration">
            {([1, 2] as const).map((w) => (
              <Button
                key={w}
                type="button"
                size="xs"
                aria-pressed={windowHours === w}
                variant={windowHours === w ? "default" : "outline"}
                onClick={() => onWindowHoursChange(w)}
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
                  {locale === "hi" ? "औसत US AQI: " : "Avg US AQI: "}
                  <span className="font-mono font-semibold">
                    {lowerWindow.bestWindow.averageUsAqi}
                  </span>
                  {lowerWindow.peakWindow ? (
                    <span className="text-muted-foreground">
                      {" "}
                      {locale === "hi"
                        ? `बनाम शिखर ${lowerWindow.peakWindow.averageUsAqi} (${formatHourInTz(
                            lowerWindow.peakWindow.startIso,
                            activeForecast.location.timezone
                          )})`
                        : `vs. peak ${lowerWindow.peakWindow.averageUsAqi} at ${formatHourInTz(
                            lowerWindow.peakWindow.startIso,
                            activeForecast.location.timezone
                          )}`}
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
                      {locale === "hi" ? lowerWindow.cautionHi : lowerWindow.cautionEn}
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
              {locale === "hi" ? lowerWindow.cautionHi : lowerWindow.cautionEn}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
