import { DEFAULT_DEMO_CITY_ID, DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import { familyProfileSchema } from "@/lib/schemas";
import type { CommuteMode, FamilyProfile, GeoLocation } from "@/types/domain";

export const CURRENT_PROFILE_VERSION = 2;

export const DEFAULT_LOCATION: GeoLocation = DEMO_LOCATIONS[0];

export const DEFAULT_FAMILY_PROFILE: FamilyProfile = {
  profileVersion: CURRENT_PROFILE_VERSION,
  onboardingCompleted: false,
  cityId: DEFAULT_DEMO_CITY_ID,
  selectedLocation: DEFAULT_LOCATION,
  householdAdults: 2,
  childrenCount: 1,
  seniorsCount: 0,
  hasRespiratorySensitivity: false,
  sensitivityOptIn: false,
  lifestyleCategory: "family_household",
  workScheduleMode: "onsite",
  outdoorPreference: "morning_walk",
  primaryCommute: "metro_rail",
  dailyCommuteKm: 14,
  commuteDurationMinutes: 35,
  commuteDaysPerWeek: 5,
  workingWeeksPerYear: 48,
  vehicleOccupancy: 1,
  hasHepaPurifier: false,
  canCrossVentilate: true,
  cookingPractice: "lpg_gas",
  budgetTier: "low_cost",
  sustainabilityGoals: ["cleaner_indoor_air", "reduce_commute_emissions"],
  preferredLocale: "en",
};

export function normalizeLegacyCommuteMode(
  mode: CommuteMode | undefined
): Exclude<CommuteMode, "walk_cycle"> {
  if (!mode || mode === "walk_cycle") return "walk";
  return mode;
}

function pickBoolean(val: unknown, fallback: boolean): boolean {
  return typeof val === "boolean" ? val : fallback;
}

function pickOptString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

/**
 * Strips unknown/sensitive fields (names, exact street addresses, medical records)
 * and migrates Phase 01-03 v1 profiles to version 2 cleanly without losing saved data.
 */
export function migratePersistedProfile(
  raw: unknown,
  fallbackProfile: FamilyProfile
): { profile: FamilyProfile; migrated: boolean; version: number } {
  if (!raw || typeof raw !== "object") {
    return {
      profile: {
        ...fallbackProfile,
        profileVersion: CURRENT_PROFILE_VERSION,
      },
      migrated: false,
      version: CURRENT_PROFILE_VERSION,
    };
  }

  const record = raw as Record<string, unknown>;
  const rawVersion =
    typeof record.profileVersion === "number" ? record.profileVersion : 1;
  const sensitivityEnabled =
    typeof record.sensitivityOptIn === "boolean"
      ? record.sensitivityOptIn && Boolean(record.hasRespiratorySensitivity)
      : Boolean(record.hasRespiratorySensitivity);

  // Pick only validated non-sensitive allowlisted fields
  const sanitizedInput: Record<string, unknown> = {
    profileVersion: CURRENT_PROFILE_VERSION,
    onboardingCompleted:
      typeof record.onboardingCompleted === "boolean"
        ? record.onboardingCompleted
        : undefined,
    cityId: pickOptString(record.cityId),
    selectedLocation: record.selectedLocation,
    householdAdults: record.householdAdults ?? fallbackProfile.householdAdults,
    childrenCount: record.childrenCount ?? fallbackProfile.childrenCount,
    seniorsCount: record.seniorsCount ?? fallbackProfile.seniorsCount,
    sensitivityOptIn: pickBoolean(
      record.sensitivityOptIn,
      Boolean(record.hasRespiratorySensitivity)
    ),
    hasRespiratorySensitivity: sensitivityEnabled,
    lifestyleCategory:
      record.lifestyleCategory ?? fallbackProfile.lifestyleCategory,
    workScheduleMode:
      record.workScheduleMode ?? fallbackProfile.workScheduleMode ?? "onsite",
    scheduleWindowSummary: pickOptString(record.scheduleWindowSummary),
    outdoorPreference:
      record.outdoorPreference ?? fallbackProfile.outdoorPreference,
    primaryCommute:
      record.primaryCommute === "walk_cycle"
        ? "walk"
        : (record.primaryCommute ?? fallbackProfile.primaryCommute),
    dailyCommuteKm: record.dailyCommuteKm ?? fallbackProfile.dailyCommuteKm,
    commuteDurationMinutes:
      record.commuteDurationMinutes ??
      fallbackProfile.commuteDurationMinutes ??
      35,
    commuteDaysPerWeek:
      record.commuteDaysPerWeek ?? fallbackProfile.commuteDaysPerWeek ?? 5,
    workingWeeksPerYear:
      record.workingWeeksPerYear ?? fallbackProfile.workingWeeksPerYear ?? 48,
    vehicleOccupancy:
      record.vehicleOccupancy ?? fallbackProfile.vehicleOccupancy ?? 1,
    hasHepaPurifier: pickBoolean(
      record.hasHepaPurifier,
      fallbackProfile.hasHepaPurifier
    ),
    canCrossVentilate: pickBoolean(
      record.canCrossVentilate,
      fallbackProfile.canCrossVentilate
    ),
    cookingPractice:
      record.cookingPractice ?? fallbackProfile.cookingPractice ?? "lpg_gas",
    budgetTier: record.budgetTier ?? fallbackProfile.budgetTier,
    sustainabilityGoals: Array.isArray(record.sustainabilityGoals)
      ? record.sustainabilityGoals
      : fallbackProfile.sustainabilityGoals,
    preferredLocale: record.preferredLocale ?? fallbackProfile.preferredLocale,
  };

  const validated = familyProfileSchema.safeParse(sanitizedInput);
  if (!validated.success) {
    return {
      profile: {
        ...fallbackProfile,
        profileVersion: CURRENT_PROFILE_VERSION,
      },
      migrated: false,
      version: rawVersion,
    };
  }

  return {
    profile: validated.data,
    migrated:
      rawVersion < CURRENT_PROFILE_VERSION ||
      record.primaryCommute === "walk_cycle",
    version: CURRENT_PROFILE_VERSION,
  };
}
