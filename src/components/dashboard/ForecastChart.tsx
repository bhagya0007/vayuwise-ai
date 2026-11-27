"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyStateCard } from "@/components/common/Controls";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeInTz, formatHourInTz } from "@/lib/air-quality/intelligence";
import type { AirQualityPoint } from "@/types/domain";

export type ForecastMetric = "usAqi" | "pm25" | "pm10";

interface ForecastChartProps {
  hourly: AirQualityPoint[];
  timezone: string;
  horizonHours: 24 | 48;
  onHorizonChange?: (hours: 24 | 48) => void;
  loading: boolean;
  emptyMessage: string;
  currentTimeIso?: string;
}

interface ChartDatum {
  axisLabel: string;
  fullLabel: string;
  value: number | null;
}

export function ForecastChart({
  hourly,
  timezone,
  horizonHours,
  onHorizonChange,
  loading,
  emptyMessage,
  currentTimeIso,
}: ForecastChartProps) {
  const [metric, setMetric] = useState<ForecastMetric>("usAqi");

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading pollution forecast">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const sliced = hourly.slice(0, horizonHours);
  const validValues = sliced.filter((pt) => {
    const val =
      metric === "usAqi"
        ? pt.usAqi
        : metric === "pm25"
          ? pt.pollutants.pm25
          : pt.pollutants.pm10;
    return val !== null && Number.isFinite(val);
  });

  if (sliced.length === 0 || validValues.length === 0) {
    return (
      <EmptyStateCard
        title="Forecast Data Unavailable"
        description={emptyMessage}
      />
    );
  }

  const data: ChartDatum[] = sliced.map((point, idx) => {
    const hourStr = formatHourInTz(point.timestampIso, timezone);
    const fullLabel = formatDateTimeInTz(point.timestampIso, timezone);
    const dayKey = fullLabel.split(",")[0] ?? "";
    const prevDayKey =
      idx > 0
        ? formatDateTimeInTz(sliced[idx - 1].timestampIso, timezone).split(",")[0] ?? ""
        : "";
    const axisLabel =
      prevDayKey && dayKey !== prevDayKey ? `${dayKey} ${hourStr}` : hourStr;

    const raw =
      metric === "usAqi"
        ? point.usAqi
        : metric === "pm25"
          ? point.pollutants.pm25
          : point.pollutants.pm10;

    return {
      axisLabel,
      fullLabel,
      value: raw !== null && Number.isFinite(raw) ? Number(raw.toFixed(1)) : null,
    };
  });

  const currentMarkerLabel = currentTimeIso
    ? data[0]?.axisLabel
    : undefined;

  const metricLabel =
    metric === "usAqi" ? "US AQI" : metric === "pm25" ? "PM₂.₅ (µg/m³)" : "PM₁₀ (µg/m³)";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Forecast metric">
          {(
            [
              { id: "usAqi", label: "US AQI" },
              { id: "pm25", label: "PM₂.₅" },
              { id: "pm10", label: "PM₁₀" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="xs"
              aria-pressed={metric === opt.id}
              variant={metric === opt.id ? "default" : "outline"}
              onClick={() => setMetric(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {onHorizonChange ? (
          <div className="flex gap-1.5" role="group" aria-label="Forecast horizon">
            {([24, 48] as const).map((h) => (
              <Button
                key={h}
                type="button"
                size="xs"
                aria-pressed={horizonHours === h}
                variant={horizonHours === h ? "default" : "outline"}
                onClick={() => onHorizonChange(h)}
              >
                {h}h
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="h-64 w-full min-w-0"
        role="img"
        aria-label={`${horizonHours}-hour ${metricLabel} forecast chart`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastMintFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            {/* Severity reference bands rendered ONLY for US AQI */}
            {metric === "usAqi" ? (
              <>
                <ReferenceArea y1={0} y2={50} fill="#16a34a" fillOpacity={0.07} />
                <ReferenceArea y1={51} y2={100} fill="#eab308" fillOpacity={0.07} />
                <ReferenceArea y1={101} y2={150} fill="#f97316" fillOpacity={0.07} />
                <ReferenceArea y1={151} y2={200} fill="#ef4444" fillOpacity={0.07} />
                <ReferenceArea y1={201} y2={300} fill="#9333ea" fillOpacity={0.07} />
              </>
            ) : null}

            <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
            <XAxis
              dataKey="axisLabel"
              tick={{ fontSize: 11 }}
              interval={horizonHours === 48 ? 7 : 3}
              stroke="currentColor"
              opacity={0.65}
            />
            <YAxis
              domain={[0, "dataMax + 25"]}
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              opacity={0.65}
            />
            {currentMarkerLabel ? (
              <ReferenceLine
                x={currentMarkerLabel}
                stroke="var(--chart-2)"
                strokeDasharray="4 4"
                label={{
                  value: "Now",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                }}
              />
            ) : null}
            <Tooltip
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: "12px",
              }}
              labelFormatter={(_label, payload) =>
                (payload?.[0]?.payload as ChartDatum | undefined)?.fullLabel ?? ""
              }
              formatter={(val) => [
                val !== null && val !== undefined ? `${val} ${metric === "usAqi" ? "US AQI" : "µg/m³"}` : "Unavailable",
                metricLabel,
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2.2}
              fill="url(#forecastMintFill)"
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
