"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PollutantCardProps {
  symbol: string;
  name: string;
  value: number | null;
  unit: string;
  description: string;
  sparklineValues?: number[];
  locale?: "en" | "hi";
}

export function PollutantCard({
  symbol,
  name,
  value,
  unit,
  description,
  sparklineValues,
  locale = "en",
}: PollutantCardProps) {
  const validSeries = (sparklineValues ?? []).filter(
    (v) => Number.isFinite(v) && v >= 0
  );
  const hasRealSeries = validSeries.length >= 4;

  let sparkPath = "";
  if (hasRealSeries) {
    const min = Math.min(...validSeries);
    const max = Math.max(...validSeries);
    const span = Math.max(1, max - min);
    sparkPath = validSeries
      .map((val, idx) => {
        const x = (idx / (validSeries.length - 1)) * 100;
        const y = 26 - ((val - min) / span) * 20;
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <Card size="sm" className="transition-colors hover:border-primary/35">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-1">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <span
              className="size-2 shrink-0 rounded-full bg-primary/80"
              aria-hidden="true"
            />
            <span>{symbol}</span>
          </CardTitle>
          <p className="truncate text-[11px] text-muted-foreground">{name}</p>
        </div>
        <Tooltip>
          <TooltipTrigger
            aria-label={`About ${name}`}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Info className="size-3.5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed">
            {description}
          </TooltipContent>
        </Tooltip>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="font-mono text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {value !== null && Number.isFinite(value)
            ? symbol === "CO"
              ? Math.round(value)
              : value.toFixed(1)
            : "—"}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
            {value !== null ? unit : locale === "hi" ? "अनुपलब्ध" : "Unavailable"}
          </span>
        </p>

        {hasRealSeries ? (
          <svg
            viewBox="0 0 100 30"
            className="h-6 w-full overflow-visible"
            aria-hidden="true"
          >
            <path
              d={sparkPath}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="h-6 flex items-center text-[10px] text-muted-foreground/70">
            {locale === "hi" ? "डेटा अनुपलब्ध" : "No series"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
