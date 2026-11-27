"use client";

import Link from "next/link";
import { MapPin, RefreshCw, Sparkles } from "lucide-react";
import { LocationSearch } from "@/components/dashboard/LocationSearch";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AppDictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type { GeoLocation, Locale } from "@/types/domain";

interface DashboardHeaderCardProps {
  greeting: string;
  householdSummary: string;
  selectedLocation: GeoLocation;
  onboardingCompleted?: boolean;
  refreshing: boolean;
  loading: boolean;
  locale: Locale;
  dict: AppDictionary;
  onRefresh: () => void;
  onSelectLocation: (
    loc: GeoLocation,
    options?: { persistPreference?: boolean }
  ) => void;
}

/**
 * Compact dashboard header with household summary, location selector, and live refresh control.
 */
export function DashboardHeaderCard({
  greeting,
  householdSummary,
  selectedLocation,
  onboardingCompleted,
  refreshing,
  loading,
  locale,
  dict,
  onRefresh,
  onSelectLocation,
}: DashboardHeaderCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
      <div className="flex flex-col justify-between gap-2.5 md:flex-row md:items-center">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">
            {greeting} · {dict.dashboard.preparedFor}{" "}
            <span className="text-foreground">{householdSummary}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {selectedLocation.name}
            </h1>
            <Badge variant="outline" className="gap-1">
              <MapPin className="size-3 text-primary" aria-hidden="true" />
              {[selectedLocation.region, selectedLocation.country]
                .filter(Boolean)
                .join(", ")}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!onboardingCompleted ? (
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "gap-1.5"
              )}
            >
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              <span>{locale === "hi" ? "प्रोफ़ाइल सेट करें" : "Personalize"}</span>
            </Link>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("size-3.5", (refreshing || loading) && "animate-spin")}
              aria-hidden="true"
            />
            <span>{dict.dashboard.refreshLabel}</span>
          </Button>
        </div>
      </div>

      <LocationSearch onSelectLocation={onSelectLocation} />
    </div>
  );
}
