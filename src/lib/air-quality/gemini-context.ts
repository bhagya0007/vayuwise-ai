import {
  buildRuleBasedGuidance,
  classifyUsAqi,
  determineDominantPollutant,
  findRelativelyLowerExposureWindows,
  POLLUTANT_DISPLAY_META,
  summarizeForecast,
} from "@/lib/air-quality/intelligence";
import { buildNormalizedPersonalizationContext } from "@/lib/personalization/engine";
import type {
  AirQualityForecast,
  DataSourceType,
  FamilyProfile,
  FreshnessStatus,
  Locale,
  NormalizedPersonalizationContext,
  PollutantKey,
  PollutantSnapshot,
  PollutantUnits,
} from "@/types/domain";

export interface GeminiAirQualityContext {
  location: {
    name: string;
    region?: string;
    country: string;
    timezone: string;
  };
  current: {
    usAqi: number | null;
    severityLabel: string;
    dominantPollutant: string | null;
    dominantPollutantLabel: string;
    pollutants: PollutantSnapshot;
    missingPollutants: PollutantKey[];
    units: PollutantUnits;
  };
  forecast24h: {
    availableHours: number;
    unhealthyOrWorseHours: number;
    allUnhealthyOrWorse: boolean;
    lowestUsAqi: number | null;
    highestUsAqi: number | null;
    trend: string;
  };
  relativelyLowerWindow: {
    available: boolean;
    startIso: string | null;
    endIso: string | null;
    averageUsAqi: number | null;
    postponeOutdoorExercise: boolean;
  };
  practicalActivityWindow: {
    available: boolean;
    startIso: string | null;
    endIso: string | null;
    averageUsAqi: number | null;
    guidanceNote: string;
  };
  provenance: {
    sourceName: string;
    dataSourceType: DataSourceType;
    aqiStandard: string;
    modelTimestampIso?: string;
    fetchedAtIso: string;
    freshnessStatus: FreshnessStatus;
    isStale: boolean;
    staleWarning?: string;
  };
  deterministicGuidance: {
    healthProtectionPriority: boolean;
    headline: string;
    recommendedPrimaryAction: string;
  };
  nonSensitiveProfileSummary: {
    householdSize: number;
    adults: number;
    children: number;
    seniors: number;
    hasChildrenOrSeniors: boolean;
    hasRespiratorySensitivity: boolean;
    lifestyleCategory: string;
    workScheduleMode: string;
    outdoorPreference: string;
    primaryCommute: string;
    dailyCommuteKm: number;
    commuteDaysPerWeek: number;
    vehicleOccupancy: number;
    hasHepaPurifier: boolean;
    canCrossVentilate: boolean;
    cookingPractice: string;
    budgetTier: string;
    sustainabilityGoals: string[];
    preferredLocale: Locale;
  };
  personalizationContext: NormalizedPersonalizationContext;
}

/**
 * Builds a clean, non-PII environmental context payload for Gemini prompts,
 * preserving modeled/cached/stale/demonstration/unavailable distinctions,
 * missing pollutant flags, and deterministic health-first guardrails.
 */
export function buildGeminiAirQualityContext(
  forecast: AirQualityForecast,
  profile: FamilyProfile,
  locale: Locale = "en"
): GeminiAirQualityContext {
  const classification = classifyUsAqi(forecast.current.usAqi);
  const dominant = determineDominantPollutant(forecast.current.subindices);
  const summary24h = summarizeForecast(forecast.hourly, 24);
  const lowerWindow = findRelativelyLowerExposureWindows(
    forecast.hourly,
    2,
    24,
    { timezone: forecast.location.timezone, profile }
  );
  const guidance = buildRuleBasedGuidance(forecast, profile, locale, lowerWindow);

  const missingPollutants = (
    Object.keys(forecast.current.pollutants) as PollutantKey[]
  ).filter((k) => forecast.current.pollutants[k] === null);

  const freshnessStatus: FreshnessStatus =
    forecast.provenance.freshnessStatus ??
    (forecast.provenance.isStale ? "stale" : "fresh");

  const staleWarning = forecast.provenance.isStale
    ? forecast.provenance.dataSourceType === "demonstration"
      ? "Demonstration data only — not current air quality measurements."
      : "Cached modeled data may be stale; advise user to refresh if conditions are shifting."
    : undefined;

  const personalizationContext = buildNormalizedPersonalizationContext({
    profile,
    location: forecast.location,
    forecast,
    locale,
  });

  return {
    location: {
      name: forecast.location.name,
      region: forecast.location.region,
      country: forecast.location.country,
      timezone: forecast.location.timezone,
    },
    current: {
      usAqi: forecast.current.usAqi,
      severityLabel: classification.band?.labelEn ?? "Unavailable",
      dominantPollutant: dominant.reliable ? dominant.dominantPollutant : null,
      dominantPollutantLabel:
        dominant.reliable && dominant.dominantPollutant
          ? `${POLLUTANT_DISPLAY_META[dominant.dominantPollutant].symbol} (subindex ${dominant.subindexValue})`
          : "Cannot be determined reliably",
      pollutants: forecast.current.pollutants,
      missingPollutants,
      units: forecast.units ?? {
        pm25: "µg/m³",
        pm10: "µg/m³",
        no2: "µg/m³",
        o3: "µg/m³",
        so2: "µg/m³",
        co: "µg/m³",
      },
    },
    forecast24h: {
      availableHours: summary24h.availableHours,
      unhealthyOrWorseHours: summary24h.unhealthyOrWorseHours,
      allUnhealthyOrWorse: summary24h.allUnhealthyOrWorse,
      lowestUsAqi: summary24h.lowestPoint?.usAqi ?? null,
      highestUsAqi: summary24h.highestPoint?.usAqi ?? null,
      trend: summary24h.trend,
    },
    relativelyLowerWindow: {
      available: lowerWindow.available,
      startIso: lowerWindow.bestWindow?.startIso ?? null,
      endIso: lowerWindow.bestWindow?.endIso ?? null,
      averageUsAqi: lowerWindow.bestWindow?.averageUsAqi ?? null,
      postponeOutdoorExercise: lowerWindow.postponeOutdoorExercise,
    },
    practicalActivityWindow: {
      available: Boolean(lowerWindow.practicalWindow),
      startIso: lowerWindow.practicalWindow?.startIso ?? null,
      endIso: lowerWindow.practicalWindow?.endIso ?? null,
      averageUsAqi: lowerWindow.practicalWindow?.averageUsAqi ?? null,
      guidanceNote:
        locale === "hi"
          ? lowerWindow.practicalWindowNoteHi
          : lowerWindow.practicalWindowNoteEn,
    },
    provenance: {
      sourceName: forecast.provenance.sourceName,
      dataSourceType: forecast.provenance.dataSourceType,
      aqiStandard: forecast.provenance.aqiStandard,
      modelTimestampIso: forecast.provenance.modelTimestampIso,
      fetchedAtIso: forecast.provenance.fetchedAtIso,
      freshnessStatus,
      isStale: forecast.provenance.isStale,
      staleWarning,
    },
    deterministicGuidance: {
      healthProtectionPriority: guidance.healthProtectionPriority,
      headline: guidance.headline,
      recommendedPrimaryAction: guidance.recommendedPrimaryAction,
    },
    nonSensitiveProfileSummary: {
      householdSize:
        profile.householdAdults + profile.childrenCount + profile.seniorsCount,
      adults: profile.householdAdults,
      children: profile.childrenCount,
      seniors: profile.seniorsCount,
      hasChildrenOrSeniors:
        profile.childrenCount > 0 || profile.seniorsCount > 0,
      hasRespiratorySensitivity: profile.hasRespiratorySensitivity,
      lifestyleCategory: profile.lifestyleCategory ?? "family_household",
      workScheduleMode: profile.workScheduleMode ?? "onsite",
      outdoorPreference: profile.outdoorPreference ?? "mixed_errands",
      primaryCommute: personalizationContext.transportationPreferences.primaryCommute,
      dailyCommuteKm: profile.dailyCommuteKm,
      commuteDaysPerWeek: profile.commuteDaysPerWeek ?? 5,
      vehicleOccupancy: personalizationContext.transportationPreferences.vehicleOccupancy,
      hasHepaPurifier: profile.hasHepaPurifier,
      canCrossVentilate: profile.canCrossVentilate,
      cookingPractice: profile.cookingPractice ?? "lpg_gas",
      budgetTier: profile.budgetTier,
      sustainabilityGoals: personalizationContext.sustainabilityObjectives,
      preferredLocale: locale,
    },
    personalizationContext,
  };
}
