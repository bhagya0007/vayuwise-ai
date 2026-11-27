"use client";

import { AlertTriangle, FlaskConical, Globe2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { DEMO_BANNER_COPY } from "@/lib/demo/air-quality-demo";

export function LocaleToggle() {
  const { locale, toggleLocale, dict } = useAppPreferences();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleLocale}
      aria-label={
        locale === "en"
          ? `${dict.languageSwitchLabel} (Switch language to Hindi)`
          : `${dict.languageSwitchLabel} (Switch language to English)`
      }
      className="gap-1.5"
    >
      <Globe2 className="size-4" aria-hidden="true" />
      <span>{dict.languageSwitchLabel}</span>
    </Button>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme, dict } = useAppPreferences();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label={
        isDark
          ? `${dict.themeLightLabel} (Switch to light theme)`
          : `${dict.themeDarkLabel} (Switch to dark theme)`
      }
      className="gap-1.5"
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">
        {isDark ? dict.themeLightLabel : dict.themeDarkLabel}
      </span>
    </Button>
  );
}

export function DemoNoticeBanner({ note }: { note?: string }) {
  const { locale, dict } = useAppPreferences();

  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200"
    >
      <div className="flex items-center gap-2 font-medium">
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        <span>{DEMO_BANNER_COPY[locale]}</span>
      </div>
      <span className="inline-block max-w-full rounded-lg border border-amber-500/40 bg-background/60 px-2.5 py-1 text-[11px] leading-snug">
        {note ?? dict.common.phasePlannedNotice}
      </span>
    </div>
  );
}

export function EmptyStateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FlaskConical className="size-5" aria-hidden="true" />
        </div>
        <div className="max-w-md space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function ErrorStateCard({
  title,
  description,
  onRetry,
  retryLabel = "Try Again",
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
