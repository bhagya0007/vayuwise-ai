export type Locale = "en" | "hi";

export type ThemeMode = "light" | "dark";

export type DataSourceType =
  | "live"
  | "modeled"
  | "cached"
  | "stale"
  | "demonstration"
  | "unavailable";

export type FreshnessStatus =
  | "fresh"
  | "cached"
  | "stale"
  | "demonstration"
  | "unavailable";

export type AqiStandard = "US_AQI" | "EAQI" | "INDIA_CPCB_REFERENCE";

export type BudgetTier = "free" | "low_cost" | "investment";

export type LifestyleCategory =
  | "individual"
  | "student"
  | "working_professional"
  | "family_household"
  | "senior_citizen"
  | "community_representative"
  | "outdoor_fitness";

export type OutdoorActivityPreference =
  | "morning_walk"
  | "evening_exercise"
  | "mixed_errands"
  | "mostly_indoors";

export type WorkScheduleMode =
  | "onsite"
  | "hybrid"
  | "remote"
  | "student_schedule"
  | "flexible";

export type CookingPractice =
  | "lpg_gas"
  | "electric_induction"
  | "mixed"
  | "solid_fuel_nearby";

export type SustainabilityGoal =
  | "reduce_commute_emissions"
  | "cleaner_indoor_air"
  | "low_cost_swaps"
  | "protect_vulnerable_members"
  | "community_action";

export type CommuteMode =
  | "car_petrol"
  | "car_diesel"
  | "car_cng"
  | "car_electric"
  | "two_wheeler"
  | "two_wheeler_electric"
  | "bus"
  | "metro_rail"
  | "carpool"
  | "walk"
  | "cycle"
  | "work_from_home"
  | "walk_cycle";

export type PollutantKey = "pm25" | "pm10" | "no2" | "o3" | "so2" | "co";

export interface GeoLocation {
  id: string;
  name: string;
  region?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
  isCurrentCoordinates?: boolean;
}

export interface PollutantSnapshot {
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  co: number | null;
}

export type PollutantUnits = Record<PollutantKey, string>;

export type UsAqiSubindices = Record<PollutantKey, number | null>;

export interface AirQualityPoint {
  timestampIso: string;
  usAqi: number | null;
  europeanAqi: number | null;
  pollutants: PollutantSnapshot;
  subindices?: UsAqiSubindices;
}

export interface DataProvenance {
  sourceName: string;
  sourceUrl: string;
  attributionLabel?: string;
  dataSourceType: DataSourceType;
  aqiStandard: AqiStandard;
  aqiStandardNote: string;
  modelTimestampIso?: string;
  fetchedAtIso: string;
  lastSuccessfulFetchIso?: string;
  cacheAgeSeconds?: number;
  freshnessStatus?: FreshnessStatus;
  isStale: boolean;
}

export interface AirQualityForecast {
  location: GeoLocation;
  current: AirQualityPoint;
  hourly: AirQualityPoint[];
  provenance: DataProvenance;
  units?: PollutantUnits;
  utcOffsetSeconds?: number;
  dominantPollutant?: PollutantKey | null;
  dominantPollutantReason?: string;
}

export interface FamilyProfile {
  profileVersion?: number;
  onboardingCompleted?: boolean;
  cityId?: string;
  selectedLocation?: GeoLocation;
  householdAdults: number;
  childrenCount: number;
  seniorsCount: number;
  hasRespiratorySensitivity: boolean;
  sensitivityOptIn?: boolean;
  lifestyleCategory?: LifestyleCategory;
  workScheduleMode?: WorkScheduleMode;
  scheduleWindowSummary?: string;
  outdoorPreference?: OutdoorActivityPreference;
  primaryCommute: CommuteMode;
  dailyCommuteKm: number;
  commuteDurationMinutes?: number;
  commuteDaysPerWeek?: number;
  workingWeeksPerYear?: number;
  vehicleOccupancy?: number;
  hasHepaPurifier: boolean;
  canCrossVentilate: boolean;
  cookingPractice?: CookingPractice;
  budgetTier: BudgetTier;
  sustainabilityGoals?: SustainabilityGoal[];
  preferredLocale: Locale;
}

export interface RoutineTimeBlock {
  window: "morning" | "midday" | "evening";
  recommendedActivity: string;
  outdoorSafetyAdvice: string;
  indoorAction: string;
  rationale: string;
}

export interface DailyRoutinePlan {
  headline: string;
  healthProtectionPriority: boolean;
  blocks: RoutineTimeBlock[];
  safetyDisclaimer: string;
  aiGenerated: boolean;
  modelUsed?: string;
  generatedAtIso: string;
}

export interface IndoorCoachGuidance {
  ventilationWindow: string;
  filtrationChecklist: string[];
  lowSmokeCookingTips: string[];
  disclaimer: string;
  aiGenerated: boolean;
  modelUsed?: string;
}

export interface SustainableAlternative {
  id: string;
  title: string;
  category: "commute" | "home_energy" | "indoor_air" | "community";
  budgetTier: BudgetTier;
  estimatedMonthlyCostInr: number;
  summary: string;
  healthCaveat?: string;
}

/**
 * Deterministic impact calculation keeps climate savings (CO2e) strictly
 * separate from personal local pollution exposure guidance.
 */
export interface DeterministicImpactEstimate {
  climateImpact: {
    dailyCo2eSavedKg: number;
    monthlyCo2eSavedKg: number;
    annualCo2eSavedKg: number;
    methodologyNote: string;
  };
  localExposureContext: {
    ambientUsAqi: number;
    ambientPm25UgM3: number | null;
    outdoorSwitchSafeToday: boolean;
    exposureGuidance: string;
  };
}

export type CalculationBoundary =
  | "tailpipe_ttw"
  | "electricity_generation_scope2"
  | "passenger_transit_operational"
  | "operational_transport_zero";

export type EmissionFactorBasis =
  | "vehicle_km"
  | "passenger_km"
  | "operational_zero";

export interface EmissionFactorEntry {
  factorId: string;
  mode: Exclude<CommuteMode, "walk_cycle">;
  category: "private_car" | "two_wheeler" | "shared_carpool" | "public_transit" | "active_or_remote";
  labelEn: string;
  labelHi: string;
  numericalFactorKgCo2e: number;
  gasBasis: "CO2" | "CO2e" | "zero_operational";
  isDerivedEstimate: boolean;
  uncertaintyRangeKg: readonly [number, number];
  unit: "kg CO2e/vkm" | "kg CO2e/pkm" | "kg CO2e/day" | "kg CO2/vkm" | "kg CO2/pkm";
  basis: EmissionFactorBasis;
  defaultOccupancy: number;
  minOccupancy: number;
  maxOccupancy: number;
  sourceTitle: string;
  tableReference: string;
  sourceUrl: string;
  publicationYear: number;
  geographicApplicability: string;
  indianSpecific: boolean;
  calculationBoundary: CalculationBoundary;
  scopeDescription: string;
  limitations: string;
}

export interface TransportScenarioInput {
  mode: CommuteMode;
  roundTripDistanceKm: number;
  travelDaysPerWeek: number;
  workingWeeksPerYear: number;
  occupancy?: number;
}

export interface TransportScenarioResult {
  mode: Exclude<CommuteMode, "walk_cycle">;
  factor: EmissionFactorEntry;
  roundTripDistanceKm: number;
  travelDaysPerWeek: number;
  workingWeeksPerYear: number;
  appliedOccupancy: number;
  formulaDescription: string;
  dailyKgCo2e: number;
  weeklyKgCo2e: number;
  monthlyKgCo2e: number;
  annualKgCo2e: number;
  annualUncertaintyRangeKg: readonly [number, number];
}

export interface BoundaryCompatibilityNotice {
  compatible: boolean;
  sameBoundary: boolean;
  summaryEn: string;
  summaryHi: string;
  baselineBoundary: CalculationBoundary;
  alternativeBoundary: CalculationBoundary;
}

export interface TransportComparisonResult {
  registryVersion: string;
  baseline: TransportScenarioResult;
  alternative: TransportScenarioResult;
  avoidedDailyKgCo2e: number;
  avoidedWeeklyKgCo2e: number;
  avoidedMonthlyKgCo2e: number;
  avoidedAnnualKgCo2e: number;
  percentageChange: number | null;
  percentageNote: string;
  isNegativeSavings: boolean;
  boundaryNotice: BoundaryCompatibilityNotice;
  assumptions: string[];
  limitations: string[];
}

export interface OutdoorExposureComparisonInput {
  baselineHourIso: string;
  baselinePm25UgM3: number | null;
  baselineUsAqi: number | null;
  alternativeHourIso: string;
  alternativePm25UgM3: number | null;
  alternativeUsAqi: number | null;
  durationHours: number;
  alternativeDurationHours?: number;
  isStaleForecast: boolean;
  dataSourceType: DataSourceType;
  locale?: Locale;
}

export interface OutdoorExposureComparisonResult {
  valid: boolean;
  warningMessage: string | null;
  healthProtectionPriority: boolean;
  baselineDurationHours: number;
  alternativeDurationHours: number;
  baselineConcentrationTimeUgHrM3: number | null;
  alternativeConcentrationTimeUgHrM3: number | null;
  differenceUgHrM3: number | null;
  unit: "µg·h/m³";
  scientificDisclosure: string;
  healthTradeOffNote: string;
}

export type ActivityType =
  | "used_public_transport"
  | "carpooled"
  | "avoided_travel"
  | "indoor_air_action"
  | "daily_planner_action"
  | "community_action";

export interface ActivityLogRecord {
  id: string;
  dedupeKey: string;
  activityType: ActivityType;
  title: string;
  completedAtIso: string;
  dateKey: string;
  baselineMode?: Exclude<CommuteMode, "walk_cycle">;
  alternativeMode?: Exclude<CommuteMode, "walk_cycle">;
  distanceKm?: number;
  occupancy?: number;
  calculatedSavingsKgCo2e: number | null;
  emissionFactorVersion: string | null;
  notes?: string;
}

export interface ActivitySummary {
  totalRecords: number;
  dailySavingsKgCo2e: number;
  weeklySavingsKgCo2e: number;
  monthlySavingsKgCo2e: number;
  countsByType: Record<ActivityType, number>;
}

export interface NormalizedPersonalizationContext {
  profileVersion: number;
  locationContext: {
    name: string;
    region?: string;
    country: string;
    timezone: string;
  };
  householdContext: {
    profileType: LifestyleCategory;
    adults: number;
    children: number;
    seniors: number;
    totalMembers: number;
    hasVulnerableMembers: boolean;
  };
  scheduleConstraints: {
    workScheduleMode: WorkScheduleMode;
    scheduleWindowSummary?: string;
    outdoorPreference: OutdoorActivityPreference;
  };
  transportationPreferences: {
    primaryCommute: Exclude<CommuteMode, "walk_cycle">;
    dailyCommuteKm: number;
    commuteDurationMinutes: number;
    commuteDaysPerWeek: number;
    workingWeeksPerYear: number;
    vehicleOccupancy: number;
    estimatedAnnualBaselineKgCo2e: number;
    baselineFactorId: string;
  };
  budgetConstraints: {
    tier: BudgetTier;
  };
  indoorEnvironment: {
    hasHepaPurifier: boolean;
    canCrossVentilate: boolean;
    cookingPractice: CookingPractice;
  };
  sustainabilityObjectives: SustainabilityGoal[];
  languagePreference: Locale;
  healthProtectionConsiderations: {
    sensitivityOptIn: boolean;
    hasRespiratorySensitivity: boolean;
    healthProtectionPriority: boolean;
    outdoorSwitchBlockedByPollution: boolean;
    ambientUsAqi: number | null;
  };
  appliedPreferenceLabels: string[];
}

export interface WhatIfScenario {
  id: string;
  label: string;
  baselineCommute: CommuteMode;
  alternativeCommute: CommuteMode;
  daysPerWeek: number;
  roundTripKm: number;
  estimate: DeterministicImpactEstimate;
}

export interface ActivityLogEntry {
  id: string;
  dateIso: string;
  actionTitle: string;
  category: SustainableAlternative["category"];
  co2eSavedKg: number;
  completed: boolean;
}
