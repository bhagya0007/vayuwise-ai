"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Globe2,
  Leaf,
  ShieldCheck,
  Sparkles,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SHELL_DICTIONARY } from "@/lib/i18n/dictionary";
import { DESIGN_TOKENS, US_AQI_BANDS } from "@/lib/constants/tokens";
import type { Locale } from "@/types/domain";

export function AppShell() {
  const [locale, setLocale] = useState<Locale>("en");
  const copy = SHELL_DICTIONARY[locale];

  const toggleLocale = () => {
    setLocale((prev) => (prev === "en" ? "hi" : "en"));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/35">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div
          className={`mx-auto flex w-full ${DESIGN_TOKENS.spacing.pageMaxWidth} items-center justify-between px-4 py-3.5 sm:px-6`}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <Wind className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {copy.brandName}
                </span>
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {copy.phaseBadge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{copy.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge
              variant="outline"
              className="hidden md:inline-flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            >
              <Activity className="size-3.5" aria-hidden="true" />
              {copy.serverStatusLabel}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleLocale}
              aria-label={
                locale === "en" ? "Switch language to Hindi" : "Switch language to English"
              }
            >
              <Globe2 className="size-4" aria-hidden="true" />
              <span>{copy.languageLabel}</span>
            </Button>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col ${DESIGN_TOKENS.spacing.pageMaxWidth} ${DESIGN_TOKENS.spacing.sectionGap} px-4 py-8 sm:px-6 sm:py-12`}
      >
        <section className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xs sm:p-10">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/8 text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {copy.phaseBadge}
            </Badge>
            <h1 className={DESIGN_TOKENS.typography.display}>{copy.heroTitle}</h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              {copy.heroSubtitle}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2" aria-label="US AQI reference bands">
            {US_AQI_BANDS.map((band) => (
              <span
                key={band.id}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${band.badgeClass}`}
              >
                {locale === "en" ? band.labelEn : band.labelHi} ({band.minUsAqi}–{band.maxUsAqi})
              </span>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wind className="size-4" aria-hidden="true" />
              </div>
              <CardTitle>{copy.aqiStandardNoticeTitle}</CardTitle>
              <CardDescription>{copy.aqiStandardNoticeBody}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </div>
              <CardTitle>{copy.healthPriorityTitle}</CardTitle>
              <CardDescription>{copy.healthPriorityBody}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Leaf className="size-4" aria-hidden="true" />
              </div>
              <CardTitle>{copy.impactSeparationTitle}</CardTitle>
              <CardDescription>{copy.impactSeparationBody}</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
            <h2 className={DESIGN_TOKENS.typography.heading}>
              {copy.foundationChecklistTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {copy.architectureModules.map((mod) => (
              <Card key={mod.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    <Badge variant="secondary">{mod.phase}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{mod.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80 bg-background/80">
        <div
          className={`mx-auto flex w-full ${DESIGN_TOKENS.spacing.pageMaxWidth} flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6`}
        >
          <p>{copy.disclaimer}</p>
          <p className="font-mono">VayuWise AI · PromptWars Challenge 6</p>
        </div>
      </footer>
    </div>
  );
}
