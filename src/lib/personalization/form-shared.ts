import { CURRENT_PROFILE_VERSION } from "@/lib/personalization/profile-storage";
import type {
  CommuteMode,
  FamilyProfile,
  GeoLocation,
  LifestyleCategory,
  Locale,
  SustainabilityGoal,
} from "@/types/domain";

export const SELECT_CONTROL_CLASS =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export const WIZARD_SELECT_CONTROL_CLASS =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export const PROFILE_TYPES: readonly LifestyleCategory[] = [
  "individual",
  "student",
  "working_professional",
  "family_household",
  "senior_citizen",
  "community_representative",
  "outdoor_fitness",
] as const;

export const COMMUTE_MODES: readonly Exclude<CommuteMode, "walk_cycle">[] = [
  "car_petrol",
  "car_diesel",
  "car_cng",
  "car_electric",
  "two_wheeler",
  "two_wheeler_electric",
  "carpool",
  "bus",
  "metro_rail",
  "walk",
  "cycle",
  "work_from_home",
] as const;

export const SUSTAINABILITY_GOALS_LIST: readonly SustainabilityGoal[] = [
  "reduce_commute_emissions",
  "cleaner_indoor_air",
  "low_cost_swaps",
  "protect_vulnerable_members",
  "community_action",
] as const;

/**
 * Normalizes a persisted `FamilyProfile` with V2 defaults for both Profile and Onboarding editors.
 */
export function buildInitialProfileDraft(
  profile: FamilyProfile,
  fallbackLocation: GeoLocation,
  options: { preferredLocale?: Locale; includeSelectedLocation?: boolean } = {}
): FamilyProfile {
  return {
    ...profile,
    profileVersion: CURRENT_PROFILE_VERSION,
    cityId: profile.cityId ?? fallbackLocation.id,
    ...(options.includeSelectedLocation
      ? { selectedLocation: profile.selectedLocation ?? fallbackLocation }
      : {}),
    preferredLocale: options.preferredLocale ?? profile.preferredLocale,
    primaryCommute:
      profile.primaryCommute === "walk_cycle" ? "walk" : profile.primaryCommute,
    workScheduleMode: profile.workScheduleMode ?? "onsite",
    commuteDurationMinutes: profile.commuteDurationMinutes ?? 35,
    commuteDaysPerWeek: profile.commuteDaysPerWeek ?? 5,
    workingWeeksPerYear: profile.workingWeeksPerYear ?? 48,
    vehicleOccupancy: profile.vehicleOccupancy ?? 1,
    cookingPractice: profile.cookingPractice ?? "lpg_gas",
    sustainabilityGoals: profile.sustainabilityGoals ?? [
      "cleaner_indoor_air",
      "reduce_commute_emissions",
    ],
  };
}
