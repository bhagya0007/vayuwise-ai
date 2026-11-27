import { classifyUsAqi } from "@/lib/air-quality/intelligence";
import { getEmissionFactorForMode } from "@/lib/impact/emission-factors";
import { calculateTransportScenario } from "@/lib/impact/transport-calculator";
import {
  CURRENT_PROFILE_VERSION,
  normalizeLegacyCommuteMode,
} from "@/lib/personalization/profile-storage";
import type {
  AirQualityForecast,
  BudgetTier,
  FamilyProfile,
  GeoLocation,
  Locale,
  NormalizedPersonalizationContext,
} from "@/types/domain";

const COST_COMPATIBILITY: Record<BudgetTier, readonly ("free" | "low_cost" | "investment")[]> = {
  free: ["free"],
  low_cost: ["free", "low_cost"],
  investment: ["free", "low_cost", "investment"],
};

const PROFILE_LABELS: Record<
  Locale,
  Record<NonNullable<FamilyProfile["lifestyleCategory"]>, string>
> = {
  en: {
    individual: "Individual",
    student: "Student",
    working_professional: "Working Professional",
    family_household: "Family Household",
    senior_citizen: "Senior Household",
    community_representative: "Community Rep",
    outdoor_fitness: "Outdoor Fitness",
  },
  hi: {
    individual: "व्यक्तिगत",
    student: "छात्र",
    working_professional: "कामकाजी पेशेवर",
    family_household: "परिवार",
    senior_citizen: "वरिष्ठ नागरिक परिवार",
    community_representative: "सामुदायिक प्रतिनिधि",
    outdoor_fitness: "आउटडोर फिटनेस",
  },
};

function finiteOr(val: number | undefined, fallback: number): number {
  return typeof val === "number" && Number.isFinite(val) ? val : fallback;
}

function buildAppliedPreferenceLabels(params: {
  locale: Locale;
  profileType: NonNullable<FamilyProfile["lifestyleCategory"]>;
  totalMembers: number;
  factorLabelEn: string;
  factorLabelHi: string;
  commuteKm: number;
  budgetTier: BudgetTier;
  hasHepaPurifier: boolean;
}): string[] {
  const { locale, profileType, totalMembers, commuteKm, budgetTier, hasHepaPurifier } =
    params;
  if (locale === "hi") {
    return [
      PROFILE_LABELS.hi[profileType],
      `${totalMembers} सदस्य`,
      `${params.factorLabelHi} (${commuteKm} किमी/दिन)`,
      `बजट: ${budgetTier}`,
      hasHepaPurifier ? "HEPA फ़िल्टर उपलब्ध" : "HEPA के बिना इनडोर सुरक्षा",
    ];
  }
  return [
    PROFILE_LABELS.en[profileType],
    `${totalMembers} household member${totalMembers > 1 ? "s" : ""}`,
    `${params.factorLabelEn} (${commuteKm} km/day)`,
    `Budget: ${budgetTier.replace("_", " ")}`,
    hasHepaPurifier ? "HEPA available" : "No HEPA purifier",
  ];
}

export function buildNormalizedPersonalizationContext(params: {
  profile: FamilyProfile;
  location: GeoLocation;
  forecast?: AirQualityForecast | null;
  locale?: Locale;
}): NormalizedPersonalizationContext {
  const { profile, location, forecast } = params;
  const locale = params.locale ?? profile.preferredLocale ?? "en";

  const adults = Math.max(1, finiteOr(profile.householdAdults, 2));
  const children = Math.max(0, finiteOr(profile.childrenCount, 0));
  const seniors = Math.max(0, finiteOr(profile.seniorsCount, 0));
  const totalMembers = adults + children + seniors;
  const sensitivityEnabled =
    profile.sensitivityOptIn !== false && Boolean(profile.hasRespiratorySensitivity);
  const hasVulnerableMembers = children > 0 || seniors > 0 || sensitivityEnabled;

  const normalizedMode = normalizeLegacyCommuteMode(profile.primaryCommute);
  const commuteKm = Math.max(0, finiteOr(profile.dailyCommuteKm, 14));
  const daysPerWeek = finiteOr(profile.commuteDaysPerWeek, 5);
  const weeksPerYear = finiteOr(profile.workingWeeksPerYear, 48);
  const occupancy = finiteOr(profile.vehicleOccupancy, 1);

  const baselineCalc = calculateTransportScenario({
    mode: normalizedMode,
    roundTripDistanceKm: commuteKm,
    travelDaysPerWeek: daysPerWeek,
    workingWeeksPerYear: weeksPerYear,
    occupancy:
      normalizedMode === "carpool"
        ? Math.max(2, occupancy)
        : Math.min(occupancy, getEmissionFactorForMode(normalizedMode).maxOccupancy),
  });

  const ambientUsAqi = forecast?.current.usAqi ?? null;
  const aqiThreshold = hasVulnerableMembers ? 101 : 151;
  const healthPriority = ambientUsAqi !== null && ambientUsAqi >= aqiThreshold;
  const outdoorBlocked = ambientUsAqi !== null && ambientUsAqi >= 151;
  const profileType = profile.lifestyleCategory ?? "family_household";
  const workScheduleMode = profile.workScheduleMode ?? "onsite";
  const cookingPractice = profile.cookingPractice ?? "lpg_gas";
  const factor = getEmissionFactorForMode(normalizedMode);

  const appliedPreferenceLabels = buildAppliedPreferenceLabels({
    locale,
    profileType,
    totalMembers,
    factorLabelEn: factor.labelEn,
    factorLabelHi: factor.labelHi,
    commuteKm,
    budgetTier: profile.budgetTier,
    hasHepaPurifier: profile.hasHepaPurifier,
  });

  return {
    profileVersion: profile.profileVersion ?? CURRENT_PROFILE_VERSION,
    locationContext: {
      name: location.name,
      region: location.region,
      country: location.country,
      timezone: location.timezone,
    },
    householdContext: {
      profileType,
      adults,
      children,
      seniors,
      totalMembers,
      hasVulnerableMembers,
    },
    scheduleConstraints: {
      workScheduleMode,
      scheduleWindowSummary: profile.scheduleWindowSummary,
      outdoorPreference: profile.outdoorPreference ?? "mixed_errands",
    },
    transportationPreferences: {
      primaryCommute: normalizedMode,
      dailyCommuteKm: commuteKm,
      commuteDurationMinutes: profile.commuteDurationMinutes ?? 35,
      commuteDaysPerWeek: daysPerWeek,
      workingWeeksPerYear: weeksPerYear,
      vehicleOccupancy: baselineCalc.appliedOccupancy,
      estimatedAnnualBaselineKgCo2e: baselineCalc.annualKgCo2e,
      baselineFactorId: baselineCalc.factor.factorId,
    },
    budgetConstraints: {
      tier: profile.budgetTier,
    },
    indoorEnvironment: {
      hasHepaPurifier: profile.hasHepaPurifier,
      canCrossVentilate: profile.canCrossVentilate,
      cookingPractice,
    },
    sustainabilityObjectives: profile.sustainabilityGoals ?? [
      "protect_vulnerable_members",
      "cleaner_indoor_air",
    ],
    languagePreference: locale,
    healthProtectionConsiderations: {
      sensitivityOptIn: Boolean(profile.sensitivityOptIn),
      hasRespiratorySensitivity: sensitivityEnabled,
      healthProtectionPriority: healthPriority,
      outdoorSwitchBlockedByPollution: outdoorBlocked || healthPriority,
      ambientUsAqi,
    },
    appliedPreferenceLabels,
  };
}

export interface PrioritizableActionCandidate {
  id: string;
  title: string;
  category:
    | "indoor_protection"
    | "respiratory_safety"
    | "enclosed_transit"
    | "remote_shift"
    | "active_outdoor"
    | "household_energy"
    | "community";
  relativeCost: "free" | "low_cost" | "investment";
  isOutdoorExertion?: boolean;
  estimatedAnnualCo2eSavedKg?: number;
  scheduleFit?: ("onsite" | "hybrid" | "remote" | "student_schedule" | "flexible")[];
}

export interface RankedActionResult<T extends PrioritizableActionCandidate> {
  item: T;
  score: number;
  healthOverrideApplied: boolean;
  suppressedByHealthPriority: boolean;
  reasons: string[];
  disclaimer: string;
}

function scoreSingleCandidate<T extends PrioritizableActionCandidate>(
  item: T,
  ctx: NormalizedPersonalizationContext,
  usAqi: number,
  aqiBandLabel: string,
  allowedCosts: readonly ("free" | "low_cost" | "investment")[],
  locale: Locale
): RankedActionResult<T> {
  const isHi = locale === "hi";
  const healthPriority = ctx.healthProtectionConsiderations.healthProtectionPriority;
  let score = 40;
  const reasons: string[] = [];
  let healthOverrideApplied = false;
  let suppressedByHealthPriority = false;

  if (item.isOutdoorExertion && (healthPriority || usAqi >= 151)) {
    score = -100;
    healthOverrideApplied = true;
    suppressedByHealthPriority = true;
    reasons.push(
      isHi
        ? `स्वास्थ्य प्राथमिकता लागू: US AQI ${usAqi} (${aqiBandLabel}) में बाहरी श्रम टालें।`
        : `Health priority override: outdoor exertion suppressed at US AQI ${usAqi} (${aqiBandLabel || "Elevated"}).`
    );
  } else if (
    healthPriority &&
    (item.category === "indoor_protection" ||
      item.category === "respiratory_safety" ||
      item.category === "remote_shift")
  ) {
    score += 40;
    healthOverrideApplied = true;
    reasons.push(
      isHi
        ? "उच्च प्रदूषण में इनडोर व श्वसन सुरक्षा को सर्वोच्च प्राथमिकता।"
        : "Boosted for health protection during elevated AQI."
    );
  }

  if (allowedCosts.includes(item.relativeCost)) {
    score += item.relativeCost === "free" && ctx.budgetConstraints.tier === "free" ? 20 : 12;
    reasons.push(
      isHi
        ? `आपके बजट स्तर (${ctx.budgetConstraints.tier}) के अनुकूल।`
        : `Fits your ${ctx.budgetConstraints.tier.replace("_", " ")} budget.`
    );
  } else {
    score -= 22;
    reasons.push(
      isHi
        ? "आपके चयनित बजट से अधिक लागत।"
        : "Exceeds your currently selected budget tier."
    );
  }

  if (
    ctx.householdContext.hasVulnerableMembers &&
    (item.category === "indoor_protection" || item.category === "respiratory_safety")
  ) {
    score += 15;
    reasons.push(
      isHi
        ? "बच्चों/वरिष्ठों या संवेदनशील परिवार के लिए उपयुक्त।"
        : "Prioritized for household members sensitive to fine particulates."
    );
  }

  if (
    !ctx.indoorEnvironment.hasHepaPurifier &&
    item.category === "indoor_protection" &&
    item.relativeCost === "free"
  ) {
    score += 10;
  }

  const workMode = ctx.scheduleConstraints.workScheduleMode;
  if (item.scheduleFit?.includes(workMode)) {
    score += 12;
    reasons.push(
      isHi
        ? `आपके शेड्यूल (${workMode}) से मेल खाता है।`
        : `Matches your ${workMode.replace("_", " ")} schedule.`
    );
  }

  const savedKg = item.estimatedAnnualCo2eSavedKg ?? 0;
  if (!suppressedByHealthPriority && savedKg > 0) {
    score += Math.min(20, Math.round(savedKg / 30));
    reasons.push(
      isHi
        ? `अनुमानित उत्सर्जन बचत: ~${Math.round(savedKg)} kg CO₂e/वर्ष।`
        : `Deterministic savings contribution: ~${Math.round(savedKg)} kg CO₂e/yr.`
    );
  }

  return {
    item,
    score,
    healthOverrideApplied,
    suppressedByHealthPriority,
    reasons,
    disclaimer: isHi
      ? "प्राथमिकता क्रम केवल वरीयता व स्वास्थ्य-सुरक्षा नियम स्कोर है — यह चिकित्सकीय जोखिम या AI सटीकता नहीं है।"
      : "Priority ranking reflects transparent preference and protection rules only — not medical risk or AI accuracy.",
  };
}

/**
 * Transparent deterministic rule-based prioritization heuristic.
 * Health protection strictly overrides CO2e optimization during unhealthy pollution.
 * Never presented as medical risk, scientific confidence, or AI accuracy.
 */
export function prioritizeRecommendations<T extends PrioritizableActionCandidate>(
  candidates: readonly T[],
  ctx: NormalizedPersonalizationContext,
  locale: Locale = ctx.languagePreference
): RankedActionResult<T>[] {
  const usAqi = ctx.healthProtectionConsiderations.ambientUsAqi ?? 100;
  const band = classifyUsAqi(usAqi);
  const aqiBandLabel =
    (locale === "hi" ? band.band?.labelHi : band.band?.labelEn) ?? "";
  const allowedCosts = COST_COMPATIBILITY[ctx.budgetConstraints.tier];

  return candidates
    .map((item) =>
      scoreSingleCandidate(item, ctx, usAqi, aqiBandLabel, allowedCosts, locale)
    )
    .sort((a, b) => b.score - a.score);
}

/**
 * Deterministic fingerprint to detect stale recommendations after profile/location updates.
 */
export function computeRecommendationFingerprint(
  location: GeoLocation,
  profile: FamilyProfile,
  locale: Locale
): string {
  return JSON.stringify({
    locId: location.id,
    lat: location.latitude,
    lon: location.longitude,
    locale,
    v: profile.profileVersion ?? 1,
    lifestyle: profile.lifestyleCategory,
    commute: profile.primaryCommute,
    km: profile.dailyCommuteKm,
    days: profile.commuteDaysPerWeek ?? 5,
    occ: profile.vehicleOccupancy ?? 1,
    budget: profile.budgetTier,
    hepa: profile.hasHepaPurifier,
    sens: profile.hasRespiratorySensitivity,
    cook: profile.cookingPractice ?? "lpg_gas",
    sched: profile.workScheduleMode ?? "onsite",
    adults: profile.householdAdults,
    children: profile.childrenCount,
    seniors: profile.seniorsCount,
  });
}
