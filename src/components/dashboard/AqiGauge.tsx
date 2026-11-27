"use client";

import { motion } from "motion/react";
import { classifyUsAqi, POLLUTANT_DISPLAY_META } from "@/lib/air-quality/intelligence";
import type { Locale, PollutantKey } from "@/types/domain";

interface AqiGaugeProps {
  usAqi: number | null;
  dominantPollutant: PollutantKey | null;
  dominantReason: string;
  locale: Locale;
}

export function AqiGauge({
  usAqi,
  dominantPollutant,
  dominantReason,
  locale,
}: AqiGaugeProps) {
  const classification = classifyUsAqi(usAqi);
  const radius = 92;
  const circumference = Math.PI * radius; // semicircle length
  const strokeDashoffset =
    circumference * (1 - classification.gaugePercent / 100);
  const strokeColor = classification.band?.cssVar ?? "var(--muted-foreground)";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-full max-w-[260px]">
        <svg
          viewBox="0 0 240 138"
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={
            classification.valid
              ? `US AQI ${classification.roundedValue}, ${classification.band?.labelEn}`
              : "US AQI reading unavailable"
          }
        >
          {/* Background semicircle track */}
          <path
            d="M 28 118 A 92 92 0 0 1 212 118"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.14"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Dynamic severity arc */}
          {classification.valid ? (
            <motion.path
              d="M 28 118 A 92 92 0 0 1 212 118"
              fill="none"
              stroke={strokeColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center text-center">
          <span className="font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
            {classification.valid ? classification.roundedValue : "—"}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {classification.isBeyondScale
              ? "US AQI (>500 Scale)"
              : "US AQI"}
          </span>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {dominantPollutant
          ? `${locale === "hi" ? "प्रमुख प्रदूषक" : "Dominant"}: ${POLLUTANT_DISPLAY_META[dominantPollutant].symbol}`
          : dominantReason}
      </p>
    </div>
  );
}
