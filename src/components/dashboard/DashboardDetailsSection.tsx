"use client";

import { ExternalLink } from "lucide-react";
import { PollutantCard } from "@/components/dashboard/PollutantCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POLLUTANT_DISPLAY_META } from "@/lib/air-quality/intelligence";
import type { AirQualityInsightCard, RuleBasedActionBundle } from "@/lib/air-quality/intelligence";
import type { AppDictionary } from "@/lib/i18n/dictionary";
import type {
  ActivitySummary,
  AirQualityForecast,
  Locale,
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

interface DashboardDetailsSectionProps {
  activeForecast: AirQualityForecast;
  guidance: RuleBasedActionBundle | null;
  insights: AirQualityInsightCard[];
  activitySummary: ActivitySummary;
  locale: Locale;
  dict: AppDictionary;
}

/**
 * Renders top-3 priority rule-based guidance cards, progressive disclosure accordions
 * for pollutant sparklines and deeper insights, and the medical safety disclaimer.
 */
export function DashboardDetailsSection({
  activeForecast,
  guidance,
  insights,
  activitySummary,
  locale,
  dict,
}: DashboardDetailsSectionProps) {
  return (
    <>
      {guidance ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {dict.dashboard.recommendationsTitle}
            </h2>
            {activitySummary.totalRecords > 0 ? (
              <Badge
                variant="outline"
                className="border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-300"
              >
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
                        item.priority === "protective" ? "secondary" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {locale === "hi"
                        ? item.priority === "protective"
                          ? "सुरक्षात्मक"
                          : "सलाह"
                        : item.priority === "protective"
                          ? "Protective"
                          : "Advisory"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="leading-relaxed text-foreground">{item.action}</p>
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
                  locale={locale}
                />
              );
            })}
          </div>
        </details>

        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-foreground sm:text-base">
            {dict.dashboard.insightsTitle}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {locale === "hi"
                ? "अतिरिक्त विश्लेषण व स्वास्थ्य स्रोत"
                : "Trends, extra tips & health sources"}
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
  );
}
