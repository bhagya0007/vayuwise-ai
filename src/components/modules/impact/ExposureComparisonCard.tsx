"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clock, ShieldAlert, Wind } from "lucide-react";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTimeInTz, formatHourInTz } from "@/lib/air-quality/intelligence";
import { compareOutdoorConcentrationTime } from "@/lib/impact/exposure-calculator";
import type { AirQualityForecast } from "@/types/domain";

export function ExposureComparisonCard({
  forecast,
  loadingForecast,
}: {
  forecast: AirQualityForecast | null;
  loadingForecast: boolean;
}) {
  const { locale, phase04Dict, selectedLocation } = useAppPreferences();
  const dict = phase04Dict.impact;

  const hours = useMemo(
    () => (forecast?.hourly ?? []).slice(0, 24),
    [forecast]
  );

  const [baseIdx, setBaseIdx] = useState(0);
  const [altIdx, setAltIdx] = useState(6);
  const [durationHours, setDurationHours] = useState(1);

  const safeBaseIdx = hours.length > 0 ? Math.min(baseIdx, hours.length - 1) : 0;
  const safeAltIdx =
    hours.length > 0 ? Math.min(altIdx, hours.length - 1) : 0;

  const basePoint = hours[safeBaseIdx] ?? null;
  const altPoint = hours[safeAltIdx] ?? null;

  const result = useMemo(
    () =>
      compareOutdoorConcentrationTime({
        baselineHourIso: basePoint?.timestampIso ?? "",
        baselinePm25UgM3: basePoint?.pollutants.pm25 ?? null,
        baselineUsAqi: basePoint?.usAqi ?? null,
        alternativeHourIso: altPoint?.timestampIso ?? "",
        alternativePm25UgM3: altPoint?.pollutants.pm25 ?? null,
        alternativeUsAqi: altPoint?.usAqi ?? null,
        durationHours,
        alternativeDurationHours: durationHours,
        isStaleForecast: Boolean(forecast?.provenance.isStale),
        dataSourceType: forecast?.provenance.dataSourceType ?? "unavailable",
        locale,
      }),
    [basePoint, altPoint, durationHours, forecast, locale]
  );

  return (
    <Card className="border-border/80">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wind className="size-4 text-sky-400" aria-hidden="true" />
              <span>{dict.exposureTitle}</span>
            </CardTitle>
            <CardDescription>{dict.exposureSubtitle}</CardDescription>
          </div>
          {forecast ? (
            <Badge variant="outline" className="text-xs">
              {forecast.provenance.sourceName} · {forecast.provenance.dataSourceType}
              {forecast.provenance.isStale ? " (stale)" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {loadingForecast
                ? locale === "hi"
                  ? "डेटा लोड हो रहा है..."
                  : "Loading hourly data..."
                : locale === "hi"
                  ? "डेटा अनुपलब्ध"
                  : "Forecast unavailable"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {hours.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-base-hour">{dict.baselineHourLabel}</Label>
              <select
                id="exp-base-hour"
                value={safeBaseIdx}
                onChange={(e) => setBaseIdx(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {hours.map((pt, idx) => (
                  <option key={pt.timestampIso} value={idx}>
                    {formatHourInTz(pt.timestampIso, selectedLocation.timezone)} · PM2.5{" "}
                    {pt.pollutants.pm25 !== null ? `${pt.pollutants.pm25} µg/m³` : "N/A"} (AQI{" "}
                    {pt.usAqi ?? "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-alt-hour">{dict.altHourLabel}</Label>
              <select
                id="exp-alt-hour"
                value={safeAltIdx}
                onChange={(e) => setAltIdx(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {hours.map((pt, idx) => (
                  <option key={pt.timestampIso} value={idx}>
                    {formatHourInTz(pt.timestampIso, selectedLocation.timezone)} · PM2.5{" "}
                    {pt.pollutants.pm25 !== null ? `${pt.pollutants.pm25} µg/m³` : "N/A"} (AQI{" "}
                    {pt.usAqi ?? "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-duration">{dict.durationLabel}</Label>
              <Input
                id="exp-duration"
                type="number"
                min={0.25}
                max={12}
                step={0.25}
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value) || 0.5)}
              />
            </div>
          </div>
        ) : null}

        {result.warningMessage ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{result.warningMessage}</span>
          </div>
        ) : null}

        {result.valid ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {dict.baselineHourLabel}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {result.baselineConcentrationTimeUgHrM3} {result.unit}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {basePoint
                  ? formatDateTimeInTz(
                      basePoint.timestampIso,
                      selectedLocation.timezone
                    )
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {dict.altHourLabel}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {result.alternativeConcentrationTimeUgHrM3} {result.unit}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {altPoint
                  ? formatDateTimeInTz(
                      altPoint.timestampIso,
                      selectedLocation.timezone
                    )
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {locale === "hi" ? "परिवेश अंतर" : "Ambient Difference"}
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  (result.differenceUgHrM3 ?? 0) > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {(result.differenceUgHrM3 ?? 0) > 0
                  ? `−${result.differenceUgHrM3}`
                  : result.differenceUgHrM3}{" "}
                {result.unit}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {durationHours}h × PM₂.₅ (µg/m³)
              </p>
            </div>
          </div>
        ) : null}

        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${
            result.healthProtectionPriority
              ? "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-200"
              : "border-border bg-muted/40 text-muted-foreground"
          }`}
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {result.healthTradeOffNote}
            </p>
            <p>{result.scientificDisclosure}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
