"use client";

import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMISSION_FACTOR_REGISTRY } from "@/lib/impact/emission-factors";
import type { Locale, TransportComparisonResult } from "@/types/domain";

interface ImpactMethodologyCardProps {
  title: string;
  baselineHeading: string;
  alternativeHeading: string;
  comp: TransportComparisonResult | null;
  showMethodology: boolean;
  onToggle: () => void;
  locale: Locale;
}

/**
 * Collapsible methodology accordion detailing active transport formulas, gas bases,
 * source citations, and the full audited 12-mode registry.
 */
export function ImpactMethodologyCard({
  title,
  baselineHeading,
  alternativeHeading,
  comp,
  showMethodology,
  onToggle,
  locale,
}: ImpactMethodologyCardProps) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={showMethodology}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {showMethodology ? (
            <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </CardHeader>

      {comp && showMethodology ? (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { label: baselineHeading, res: comp.baseline },
              { label: alternativeHeading, res: comp.alternative },
            ].map(({ label, res }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-muted/25 p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {label}: {locale === "hi" ? res.factor.labelHi : res.factor.labelEn}
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {res.factor.factorId} · {res.factor.publicationYear}
                  </Badge>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-primary">
                  {res.formulaDescription} = {res.dailyKgCo2e.toFixed(3)}{" "}
                  {res.factor.gasBasis === "CO2" ? "kg CO₂" : "kg CO₂e"}/day
                </p>
                <p className="mt-1 text-muted-foreground">
                  <strong>{locale === "hi" ? "आधार" : "Basis"}:</strong>{" "}
                  {res.factor.gasBasis}{" "}
                  {res.factor.isDerivedEstimate
                    ? "(derived from CEA grid × vehicle consumption)"
                    : ""}{" "}
                  · <strong>{locale === "hi" ? "सीमा" : "Range"}:</strong> [
                  {res.factor.uncertaintyRangeKg[0]} – {res.factor.uncertaintyRangeKg[1]}]{" "}
                  {res.factor.unit}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <strong>{locale === "hi" ? "तालिका संदर्भ" : "Source Table"}:</strong>{" "}
                  {res.factor.tableReference}
                </p>
                <p className="mt-1 text-muted-foreground">{res.factor.scopeDescription}</p>
                <a
                  href={res.factor.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <span>{res.factor.sourceTitle}</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-xs">
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="size-4 text-primary" aria-hidden="true" />
              {locale === "hi"
                ? `सभी 12 दस्तावेज़ित परिवहन विकल्प (${comp.registryVersion})`
                : `All 12 Documented Modes (${comp.registryVersion})`}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(EMISSION_FACTOR_REGISTRY).map((ef) => (
                <div
                  key={ef.factorId}
                  className="rounded-lg border border-border bg-background/70 p-2.5"
                >
                  <p className="font-semibold">
                    {locale === "hi" ? ef.labelHi : ef.labelEn}
                  </p>
                  <p className="font-mono text-[11px] text-primary">
                    {ef.numericalFactorKgCo2e} {ef.unit}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {ef.geographicApplicability}
                  </p>
                </div>
              ))}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {comp.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
