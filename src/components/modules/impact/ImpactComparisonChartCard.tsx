"use client";

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
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatSignedCo2eDiff } from "@/lib/impact/transport-calculator";
import type { Phase04Dictionary } from "@/lib/i18n/phase04-dictionary";
import type {
  CommuteMode,
  Locale,
  TransportComparisonResult,
} from "@/types/domain";

export type ImpactHorizon = "daily" | "weekly" | "monthly" | "annual";

interface ImpactComparisonChartCardProps {
  comp: TransportComparisonResult | null;
  calculationError?: string;
  baselineMode: Exclude<CommuteMode, "walk_cycle">;
  altMode: Exclude<CommuteMode, "walk_cycle">;
  horizon: ImpactHorizon;
  onHorizonChange: (horizon: ImpactHorizon) => void;
  locale: Locale;
  phase04Dict: Phase04Dictionary;
}

/**
 * Deterministic CO2e comparison KPIs, horizon switcher, scope boundary alert,
 * and accessible bar chart for baseline vs. alternative travel modes.
 */
export function ImpactComparisonChartCard({
  comp,
  calculationError,
  baselineMode,
  altMode,
  horizon,
  onHorizonChange,
  locale,
  phase04Dict,
}: ImpactComparisonChartCardProps) {
  const dict = phase04Dict.impact;

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
    <Card className="lg:col-span-7 border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {locale === "hi"
              ? "नियतात्मक उत्सर्जन तुलना (kg CO₂e)"
              : "Deterministic CO₂e Comparison"}
          </CardTitle>
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-0.5 text-xs"
            role="group"
            aria-label={locale === "hi" ? "समय अवधि" : "Comparison horizon"}
          >
            {(["daily", "weekly", "monthly", "annual"] as const).map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={horizon === h}
                onClick={() => onHorizonChange(h)}
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
        {comp ? <CardDescription>{comp.percentageNote}</CardDescription> : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {comp ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: dict.dailyLabel, val: formatSignedCo2eDiff(comp.avoidedDailyKgCo2e, 2) },
                { label: dict.weeklyLabel, val: formatSignedCo2eDiff(comp.avoidedWeeklyKgCo2e, 1) },
                { label: dict.monthlyLabel, val: formatSignedCo2eDiff(comp.avoidedMonthlyKgCo2e, 1) },
                { label: dict.annualLabel, val: formatSignedCo2eDiff(comp.avoidedAnnualKgCo2e, 1) },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs"
                >
                  <span className="text-muted-foreground">{kpi.label}</span>
                  <p className="mt-0.5 font-semibold tabular-nums">{kpi.val} kg</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground">
              {locale === "hi"
                ? "नोट: ऋणात्मक चिह्न (−) उत्सर्जन में कमी दर्शाता है; धनात्मक (+) उत्सर्जन में वृद्धि दर्शाता है।"
                : "Sign convention: − denotes estimated emissions avoided vs. baseline; + denotes an emissions increase."}
            </p>

            <div
              className="h-60 w-full min-w-0"
              role="img"
              aria-label={`Emissions comparison chart: ${chartData
                .map((d) => `${d.name}: ${d.emissions} kg CO2e`)
                .join(", ")}`}
            >
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
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {locale === "hi"
                    ? comp.boundaryNotice.summaryHi
                    : comp.boundaryNotice.summaryEn}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {calculationError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
