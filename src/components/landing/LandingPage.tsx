"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CloudFog,
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
      {/* Public Navigation Bar */}
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
              href="/dashboard"
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
                href="/dashboard"
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
        {/* Cinematic Hero */}
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 lg:col-span-6"
          >
            <Badge
              variant="outline"
              className="h-auto max-w-full whitespace-normal gap-1.5 border-emerald-500/35 bg-emerald-500/10 py-1 text-emerald-800 dark:text-emerald-300"
            >
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{landing.hero.badge}</span>
            </Badge>

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.06]">
                <span className="block">{landing.hero.headlineLine1}</span>
                <span className="block text-primary">{landing.hero.headlineLine2}</span>
              </h1>
              <p className="text-base font-medium text-foreground/85 sm:text-xl">
                {landing.hero.supportingHeadline}
              </p>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
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
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-5"
                )}
              >
                {locale === "hi" ? "गाइडेड सेटअप" : "Guided Setup"}
              </Link>
              <a
                href="#features"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 px-4 text-muted-foreground hover:text-foreground"
                )}
              >
                {landing.hero.secondaryCta}
              </a>
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

        {/* Interactive Product Preview Strip */}
        <section className="border-y border-border bg-secondary/45">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 sm:px-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {landing.preview.eyebrow}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {landing.preview.title}
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {landing.preview.description}
                </p>
              </div>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-1.5")}
              >
                <span>{landing.nav.launchAssistant}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:grid-cols-12">
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 lg:col-span-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {locale === "hi" ? "लाइव मॉडल्ड स्रोत" : "Live Modeled Source"}
                  </span>
                  <Badge variant="secondary">Open-Meteo / CAMS</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "hi" ? "नई दिल्ली · US AQI" : "New Delhi · US AQI"}
                  </p>
                  <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
                    {locale === "hi" ? "लाइव फ़ीड" : "Live Feed"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locale === "hi"
                      ? "सब-इंडेक्स प्रमुख प्रदूषक पहचान + 48 घंटे का पूर्वानुमान"
                      : "Subindex dominant pollutant detection + 48h outlook"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-8">
                {[
                  {
                    code: "PM₂.₅",
                    note:
                      locale === "hi"
                        ? "सूक्ष्म कण (µg/m³)"
                        : "Fine particulates (µg/m³)",
                  },
                  {
                    code: "PM₁₀",
                    note:
                      locale === "hi"
                        ? "मोटे धूल कण (µg/m³)"
                        : "Coarse dust (µg/m³)",
                  },
                  {
                    code: "NO₂",
                    note:
                      locale === "hi"
                        ? "ट्रैफ़िक नाइट्रोजन डाइऑक्साइड"
                        : "Traffic nitrogen dioxide",
                  },
                  {
                    code: "O₃",
                    note: locale === "hi" ? "सतही ओज़ोन" : "Surface ozone",
                  },
                  {
                    code: locale === "hi" ? "48 घंटे वक्र" : "48h Curve",
                    note:
                      locale === "hi"
                        ? "मध्यरात्रि-सचेत स्वच्छ विंडो"
                        : "Midnight-aware windows",
                  },
                  {
                    code: locale === "hi" ? "स्वास्थ्य पहले" : "Health First",
                    note:
                      locale === "hi"
                        ? "नियम-आधारित सुरक्षा नियम"
                        : "Rule-based safety rules",
                  },
                ].map((tile) => (
                  <div
                    key={tile.code}
                    className="rounded-xl border border-border bg-background/60 p-3.5"
                  >
                    <p className="font-mono text-sm font-semibold text-primary">
                      {tile.code}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{tile.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Environmental Storytelling / Problem Section */}
        <section id="problem" className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <div className="max-w-2xl space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {landing.problem.eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {landing.problem.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {landing.problem.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {landing.problem.cards.map((card) => (
              <Card key={card.title} className="transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 dark:text-[#FFB547]">
                    <CloudFog className="size-4" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {card.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Bento-Grid Feature Showcase */}
        <section id="features" className="border-y border-border bg-secondary/35">
          <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
            <div className="max-w-2xl space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {landing.features.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {landing.features.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {landing.features.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {landing.features.items.map((item, idx) => {
                const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
                const spanClass =
                  idx === 0 || idx === 3
                    ? "md:col-span-7"
                    : "md:col-span-5";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group block rounded-xl focus-visible:outline-none",
                      spanClass
                    )}
                  >
                    <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/50">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                            <Icon className="size-4" aria-hidden="true" />
                          </div>
                          <Badge variant="outline" className="text-[11px]">
                            {item.tag}
                          </Badge>
                        </div>
                        <CardTitle className="flex items-center justify-between gap-2 pt-2 text-base">
                          <span>{item.title}</span>
                          <ArrowRight
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </CardTitle>
                        <CardDescription className="leading-relaxed">
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

        {/* Connected 4-Step How It Works */}
        <section id="how-it-works" className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {landing.howItWorks.eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {landing.howItWorks.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {landing.howItWorks.steps.map((step) => (
              <Card key={step.step} className="relative">
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

        {/* Trust & Transparency */}
        <section id="trust" className="border-t border-border bg-secondary/35">
          <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
            <div className="max-w-3xl space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {landing.trust.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {landing.trust.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {landing.trust.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {landing.trust.pillars.map((pillar, idx) => {
                const Icon = idx === 0 ? Activity : idx === 1 ? ShieldCheck : Lock;
                return (
                  <Card key={pillar.title}>
                    <CardHeader>
                      <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-700 dark:text-[#34E8A5]">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-base">{pillar.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {pillar.body}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Final CTA */}
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-card p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="max-w-2xl space-y-1.5">
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
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
                {locale === "hi" ? "प्रिंटेबल रिपोर्ट" : "Printable Report"}
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
