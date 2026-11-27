"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { buildNormalizedPersonalizationContext } from "@/lib/personalization/engine";

export function PersonalizationStatusStrip({
  generatedFingerprint,
}: {
  generatedFingerprint: string | null;
}) {
  const {
    profile,
    selectedLocation,
    locale,
    recommendationFingerprint,
    phase04Dict,
  } = useAppPreferences();

  const ctx = buildNormalizedPersonalizationContext({
    profile,
    location: selectedLocation,
    locale,
  });

  const isStale =
    generatedFingerprint !== null &&
    generatedFingerprint !== recommendationFingerprint;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            {phase04Dict.staleNotice.tailoredFor}:
          </span>
          {ctx.appliedPreferenceLabels.map((lbl) => (
            <Badge key={lbl} variant="secondary" className="text-[11px] font-normal">
              {lbl}
            </Badge>
          ))}
        </div>
        <Link
          href="/profile"
          className="text-[11px] font-medium text-primary hover:underline"
        >
          {locale === "hi" ? "प्रोफ़ाइल बदलें →" : "Edit profile →"}
        </Link>
      </div>

      {isStale ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-950 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">{phase04Dict.staleNotice.title}: </span>
            <span>{phase04Dict.staleNotice.body}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
