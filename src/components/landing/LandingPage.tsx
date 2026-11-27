"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChevronDown,
  Leaf,
  Lock,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  Wind,
  X,
} from "lucide-react";
import { VayuLogo } from "@/components/brand/VayuLogo";
import { LocaleToggle, ThemeToggle } from "@/components/common/Controls";
import { HeroVisualization } from "@/components/landing/HeroVisualization";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURE_ICONS = [
  Activity,
  CalendarClock,
  Wind,
  Leaf,
  BarChart3,
  Users,
] as const;

export function LandingPage() {
  const { dict, locale } = useAppPreferences();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { landing } = dict;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Compact Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <VayuLogo subtitle={dict.tagline} />
          </Link>

          <nav
            aria-label="Landing navigation"
            className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex"
          >
            <a href="#top" className="hover:text-foreground transition-colors">
              {landing.nav.home}
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              {landing.nav.features}
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              {landing.nav.howItWorks}
            </a>
            <a href="#trust" className="hover:text-foreground transition-colors">
              {landing.nav.about}
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <Link
              href="/assistant"
              className={cn(
                buttonVariants({ size: "sm" }),
                "hidden sm:inline-flex gap-1.5"
              )}
            >
              <span>{landing.nav.launchAssistant}</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-expanded={mobileNavOpen}
              aria-label={dict.common.menuLabel}
            >
              {mobileNavOpen ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Menu className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-border bg-card px-4 py-4 lg:hidden">
            <nav
              aria-label="Mobile landing navigation"
              className="flex flex-col gap-3 text-sm font-medium"
            >
              <a href="#top" onClick={() => setMobileNavOpen(false)} className="py-1">
                {landing.nav.home}
              </a>
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="py-1">
                {landing.nav.features}
              </a>
              <a href="#how-it-works" onClick={() => setMobileNavOpen(false)} className="py-1">
                {landing.nav.howItWorks}
              </a>
              <a href="#trust" onClick={() => setMobileNavOpen(false)} className="py-1">
                {landing.nav.about}
              </a>
              <Link
                href="/assistant"
                onClick={() => setMobileNavOpen(false)}
                className={cn(buttonVariants({ size: "sm" }), "mt-1 w-full justify-center")}
              >
                {landing.nav.launchAssistant}
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-5 lg:col-span-6"
          >
            <Badge
              variant="outline"
              className="h-auto gap-1.5 border-emerald-500/35 bg-emerald-500/10 py-1 text-emerald-800 dark:text-emerald-300"
            >
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{landing.hero.badge}</span>
            </Badge>

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.06]">
                <span className="block">{landing.hero.headlineLine1}</span>
                <span className="block text-primary">{landing.hero.headlineLine2}</span>
              </h1>
              <p className="text-base font-medium text-foreground/90 sm:text-xl">
                {landing.hero.supportingHeadline}
              </p>
            </div>

            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {landing.hero.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }), "h-11 gap-2 px-6")}
              >
                <span>{landing.hero.primaryCta}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-5"
                )}
              >
                {landing.hero.secondaryCta}
              </a>
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 px-4 text-muted-foreground hover:text-foreground"
                )}
              >
                {locale === "hi" ? "त्वरित सेटअप" : "Guided Setup"}
              </Link>
            </div>
          </motion.div>

          <div className="lg:col-span-6">
            <HeroVisualization
              smogLabel={landing.hero.smogLabel}
              cleanLabel={landing.hero.cleanLabel}
              previewBadge={landing.hero.previewBadge}
            />
          </div>
        </section>

        {/* 2. Product Features */}
        <section id="features" className="border-y border-border bg-secondary/35">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 sm:px-6">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {landing.features.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {landing.features.title}
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                {landing.features.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {landing.features.items.map((item, idx) => {
                const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group block rounded-2xl focus-visible:outline-none"
                  >
                    <Card className="h-full transition-colors group-hover:border-primary/45">
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                            <Icon className="size-4" aria-hidden="true" />
                          </div>
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {item.tag}
                          </Badge>
                        </div>
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{item.title}</span>
                          <ArrowRight
                            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm leading-relaxed">
                          {item.body}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. How It Works (3 Steps) */}
        <section id="how-it-works" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 sm:px-6">
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {landing.howItWorks.eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {landing.howItWorks.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {landing.howItWorks.steps.map((step) => (
              <Card key={step.step}>
                <CardHeader>
                  <span className="font-mono text-xs font-semibold text-primary">
                    {step.step}
                  </span>
                  <CardTitle className="pt-1 text-base">{step.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {step.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* 4. Trust and Transparency (+ Progressive Disclosure Methodology) */}
        <section id="trust" className="border-t border-border bg-secondary/35">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 sm:px-6">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {landing.trust.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {landing.trust.title}
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                {landing.trust.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {landing.trust.pillars.map((pillar, idx) => {
                const Icon = idx === 0 ? Activity : idx === 1 ? ShieldCheck : Lock;
                return (
                  <Card key={pillar.title}>
                    <CardHeader className="pb-2">
                      <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-700 dark:text-[#34E8A5]">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-base">{pillar.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {pillar.body}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <details className="rounded-2xl border border-border bg-card px-5 py-3.5 text-xs text-muted-foreground">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground">
                <span>
                  {locale === "hi"
                    ? "पद्धति और डेटा स्रोत विवरण (Open-Meteo, CPCB, उत्सर्जन कारक)"
                    : "Methodology & Data Sources (Open-Meteo, CPCB Distinction, Audited Emission Factors)"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              </summary>
              <div className="mt-3 space-y-2 border-t border-border/60 pt-3 leading-relaxed">
                <p>
                  {locale === "hi"
                    ? "वायु गुणवत्ता Open-Meteo / CAMS क्षेत्रीय मॉडल पर आधारित US AQI दिखाती है, जो आधिकारिक भारतीय CPCB NAQI ग्राउंड स्टेशनों से भिन्न है।"
                    : "Air quality uses Open-Meteo / CAMS atmospheric modeled US AQI — explicitly separate from official Indian CPCB NAQI station monitors."}
                </p>
                <p>
                  {locale === "hi"
                    ? "यात्रा उत्सर्जन गणना CEA इंडिया v20.0 (0.727 kg CO₂/kWh), इंडिया GHG प्रोग्राम v1.0 और UK DESNZ 2024 पर आधारित है और व्यक्तिगत श्वसन जोखिम से अलग रखी जाती है।"
                    : "Travel impact math uses audited factors from CEA India v20.0 (0.727 kg CO₂/kWh), India GHG Program v1.0, and UK DESNZ 2024, strictly separated from outdoor inhalation exposure."}
                </p>
              </div>
            </details>

            {/* 5. Final CTA */}
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-card p-6 sm:flex-row sm:items-center">
              <div className="max-w-2xl space-y-1">
                <h3 className="text-xl font-semibold tracking-tight">
                  {landing.finalCta.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {landing.finalCta.body}
                </p>
              </div>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }), "shrink-0 gap-2")}
              >
                <span>{landing.finalCta.cta}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <VayuLogo subtitle={dict.tagline} />
            <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">
                {dict.nav.dashboard}
              </Link>
              <Link href="/assistant" className="hover:text-foreground">
                {dict.nav.assistant}
              </Link>
              <Link href="/impact" className="hover:text-foreground">
                {dict.nav.impact}
              </Link>
              <Link href="/report" className="hover:text-foreground">
                {dict.nav.report}
              </Link>
              <Link href="/profile" className="hover:text-foreground">
                {dict.nav.profile}
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                {dict.nav.settings}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-border pt-4 text-xs text-muted-foreground md:grid-cols-3">
            <p>{landing.footer.attribution}</p>
            <p>{landing.footer.privacy}</p>
            <p>{landing.footer.disclaimer}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
