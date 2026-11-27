import Link from "next/link";
import { ArrowRight, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { DemoNoticeBanner } from "@/components/common/Controls";
import { AqiGauge } from "@/components/dashboard/AqiGauge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AqiClassificationResult,
  DominantPollutantResult,
  RuleBasedActionBundle,
} from "@/lib/air-quality/intelligence";
import { formatDateTimeInTz, formatHourInTz } from "@/lib/air-quality/intelligence";
import type { AppDictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type { AirQualityForecast, Locale } from "@/types/domain";

export function DashboardFreshnessBar({
  activeForecast,
  isDemo,
  isStale,
  freshness,
  locale,
  dict,
  onReturnToLive,
}: {
  activeForecast: AirQualityForecast | null;
  isDemo: boolean;
  isStale: boolean;
  freshness: keyof AppDictionary["dashboard"]["freshnessLabels"];
  locale: Locale;
  dict: AppDictionary;
  onReturnToLive: () => void;
}) {
  if (isDemo) {
    return (
      <div className="space-y-2">
        <DemoNoticeBanner />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="xs" onClick={onReturnToLive}>
            {dict.dashboard.returnToLiveLabel}
          </Button>
        </div>
      </div>
    );
  }
  if (!activeForecast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs",
        isStale
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 font-medium">
        <span
          className={cn(
            "size-2 rounded-full",
            isStale ? "bg-amber-500" : "bg-emerald-500"
          )}
          aria-hidden="true"
        />
        <span>{dict.dashboard.freshnessLabels[freshness]}</span>
      </div>
      <details className="text-[11px] opacity-90">
        <summary className="cursor-pointer select-none font-medium hover:underline">
          {locale === "hi" ? "डेटा विवरण" : "Data timestamp & source"}
        </summary>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
          <span>
            {dict.dashboard.modelTimestamp}:{" "}
            {formatDateTimeInTz(
              activeForecast.provenance.modelTimestampIso ??
                activeForecast.current.timestampIso,
              activeForecast.location.timezone
            )}
          </span>
          <span>
            {dict.dashboard.fetchedAt}:{" "}
            {formatHourInTz(
              activeForecast.provenance.fetchedAtIso,
              activeForecast.location.timezone
            )}{" "}
            ({activeForecast.location.timezone})
          </span>
        </div>
      </details>
    </div>
  );
}

export function DashboardAqiAndGuidanceGrid({
  activeForecast,
  isDemo,
  classification,
  dominant,
  guidance,
  locale,
  dict,
}: {
  activeForecast: AirQualityForecast;
  isDemo: boolean;
  classification: AqiClassificationResult;
  dominant: DominantPollutantResult;
  guidance: RuleBasedActionBundle | null;
  locale: Locale;
  dict: AppDictionary;
}) {
  const band = classification.band;
  const bandLabel = band
    ? locale === "hi"
      ? band.labelHi
      : band.labelEn
    : locale === "hi"
      ? "अनुपलब्ध"
      : "Unavailable";

  const bandDesc = band
    ? locale === "hi"
      ? band.descriptionHi
      : band.descriptionEn
    : locale === "hi"
      ? "मॉडल से वर्तमान US AQI मान उपलब्ध नहीं है।"
      : "Current US AQI value is unavailable from the model.";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {isDemo
                ? locale === "hi"
                  ? "US AQI (डेमो डेटा)"
                  : "US AQI (Demonstration)"
                : dict.dashboard.usAqiTitle}
            </CardTitle>
            <Badge variant="outline" className={band?.badgeClass}>
              {bandLabel}
            </Badge>
          </div>
          <CardDescription>{dict.dashboard.usAqiNote}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AqiGauge
            usAqi={activeForecast.current.usAqi}
            dominantPollutant={dominant.dominantPollutant}
            dominantReason={locale === "hi" ? dominant.reasonHi : dominant.reasonEn}
            locale={locale}
          />
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {bandDesc}
          </p>
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            {locale === "hi" ? (
              <>
                <a
                  href="https://open-meteo.com/en/docs/air-quality-api"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  Open-Meteo / CAMS
                </a>{" "}
                द्वारा क्षेत्रीय मॉडल्ड अनुमान; सड़क-स्तरीय ट्रैफ़िक प्रदूषण भिन्न हो सकता है।
              </>
            ) : (
              <>
                Regional modeled estimates via{" "}
                <a
                  href="https://open-meteo.com/en/docs/air-quality-api"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  Open-Meteo / CAMS
                </a>
                ; street-level traffic exposure can differ.
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {guidance ? (
        <Card className="flex flex-col lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/35 bg-primary/10 text-primary"
              >
                <Sparkles className="size-3" aria-hidden="true" />
                {locale === "hi"
                  ? "नियम-आधारित स्वास्थ्य मार्गदर्शन · AI तैयार"
                  : "Rule-Based Intelligence · AI Ready"}
              </Badge>
              {guidance.healthProtectionPriority ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                >
                  <ShieldAlert className="size-3" aria-hidden="true" />
                  {locale === "hi" ? "स्वास्थ्य प्राथमिकता" : "Health Priority"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300"
                >
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  {locale === "hi" ? "मानक सलाह" : "Standard Advisory"}
                </Badge>
              )}
            </div>
            <CardTitle className="pt-1 text-lg sm:text-xl">
              {guidance.headline}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="rounded-xl border border-border bg-muted/35 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {locale === "hi" ? "आज का मुख्य कदम" : "Top Recommendation"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {guidance.recommendedPrimaryAction}
                </p>
              </div>

              <ul className="space-y-1.5 px-0.5 text-xs text-muted-foreground">
                {guidance.items.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <strong className="font-medium text-foreground">
                        {item.title}:
                      </strong>{" "}
                      {item.action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5 pt-1">
              <details className="rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-xs">
                <summary className="cursor-pointer select-none font-medium text-foreground">
                  {locale === "hi"
                    ? "यह सलाह क्यों और अपेक्षित लाभ"
                    : "Why this helps & expected benefit"}
                </summary>
                <div className="mt-2 space-y-1.5 text-muted-foreground">
                  <p>{guidance.whyItMatters}</p>
                  <p className="text-foreground/90">
                    {guidance.expectedQualitativeBenefit}
                  </p>
                </div>
              </details>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/planner"
                  className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
                >
                  <span>
                    {locale === "hi" ? "आज की योजना बनाएं" : "Plan my day"}
                  </span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/assistant"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-1.5"
                  )}
                >
                  <span>{locale === "hi" ? "Vayu AI से पूछें" : "Ask Vayu AI"}</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
