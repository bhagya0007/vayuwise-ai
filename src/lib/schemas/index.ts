import { z } from "zod";

export const localeSchema = z.enum(["en", "hi"]);

export const themeModeSchema = z.enum(["light", "dark"]);

export const budgetTierSchema = z.enum(["free", "low_cost", "investment"]);

export const lifestyleCategorySchema = z.enum([
  "individual",
  "student",
  "working_professional",
  "family_household",
  "senior_citizen",
  "community_representative",
  "outdoor_fitness",
]);

export const outdoorActivityPreferenceSchema = z.enum([
  "morning_walk",
  "evening_exercise",
  "mixed_errands",
  "mostly_indoors",
]);

export const workScheduleModeSchema = z.enum([
  "onsite",
  "hybrid",
  "remote",
  "student_schedule",
  "flexible",
]);

export const cookingPracticeSchema = z.enum([
  "lpg_gas",
  "electric_induction",
  "mixed",
  "solid_fuel_nearby",
]);

export const sustainabilityGoalSchema = z.enum([
  "reduce_commute_emissions",
  "cleaner_indoor_air",
  "low_cost_swaps",
  "protect_vulnerable_members",
  "community_action",
]);

export const commuteModeSchema = z.enum([
  "car_petrol",
  "car_diesel",
  "car_cng",
  "car_electric",
  "two_wheeler",
  "two_wheeler_electric",
  "bus",
  "metro_rail",
  "carpool",
  "walk",
  "cycle",
  "work_from_home",
  "walk_cycle",
]);

export const geoLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.string().optional(),
  country: z.string().min(1),
  countryCode: z.string().min(2).max(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  population: z.number().nonnegative().optional(),
  isCurrentCoordinates: z.boolean().optional(),
});

export const familyProfileSchema = z.object({
  profileVersion: z.number().int().min(1).max(10).optional(),
  onboardingCompleted: z.boolean().optional(),
  cityId: z.string().min(1).optional(),
  selectedLocation: geoLocationSchema.optional(),
  householdAdults: z.number().int().min(1).max(20),
  childrenCount: z.number().int().min(0).max(20),
  seniorsCount: z.number().int().min(0).max(20),
  hasRespiratorySensitivity: z.boolean(),
  sensitivityOptIn: z.boolean().optional(),
  lifestyleCategory: lifestyleCategorySchema.optional(),
  workScheduleMode: workScheduleModeSchema.optional(),
  scheduleWindowSummary: z.string().trim().max(120).optional(),
  outdoorPreference: outdoorActivityPreferenceSchema.optional(),
  primaryCommute: commuteModeSchema,
  dailyCommuteKm: z.number().min(0).max(300),
  commuteDurationMinutes: z.number().int().min(0).max(480).optional(),
  commuteDaysPerWeek: z.number().int().min(0).max(7).optional(),
  workingWeeksPerYear: z.number().int().min(1).max(52).optional(),
  vehicleOccupancy: z.number().int().min(1).max(6).optional(),
  hasHepaPurifier: z.boolean(),
  canCrossVentilate: z.boolean(),
  cookingPractice: cookingPracticeSchema.optional(),
  budgetTier: budgetTierSchema,
  sustainabilityGoals: z.array(sustainabilityGoalSchema).max(5).optional(),
  preferredLocale: localeSchema,
});

export const airQualityQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  name: z.string().trim().min(1).max(120).optional(),
  region: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().min(2).max(3).optional(),
  timezone: z.string().trim().min(1).max(64).default("auto"),
  forecastDays: z.coerce.number().int().min(1).max(3).default(3),
  refresh: z.enum(["0", "1", "true", "false"]).optional(),
});

export const locationSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(15).default(8),
});

export const openMeteoAirQualityResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  utc_offset_seconds: z.number().default(0),
  timezone: z.string().default("GMT"),
  timezone_abbreviation: z.string().optional(),
  current_units: z.record(z.string(), z.string()).optional(),
  current: z
    .object({
      time: z.string(),
      us_aqi: z.number().nullable().optional(),
      us_aqi_pm2_5: z.number().nullable().optional(),
      us_aqi_pm10: z.number().nullable().optional(),
      us_aqi_nitrogen_dioxide: z.number().nullable().optional(),
      us_aqi_ozone: z.number().nullable().optional(),
      us_aqi_sulphur_dioxide: z.number().nullable().optional(),
      us_aqi_carbon_monoxide: z.number().nullable().optional(),
      pm2_5: z.number().nullable().optional(),
      pm10: z.number().nullable().optional(),
      nitrogen_dioxide: z.number().nullable().optional(),
      ozone: z.number().nullable().optional(),
      sulphur_dioxide: z.number().nullable().optional(),
      carbon_monoxide: z.number().nullable().optional(),
    })
    .optional(),
  hourly_units: z.record(z.string(), z.string()).optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      us_aqi: z.array(z.number().nullable()).optional(),
      us_aqi_pm2_5: z.array(z.number().nullable()).optional(),
      us_aqi_pm10: z.array(z.number().nullable()).optional(),
      us_aqi_nitrogen_dioxide: z.array(z.number().nullable()).optional(),
      us_aqi_ozone: z.array(z.number().nullable()).optional(),
      us_aqi_sulphur_dioxide: z.array(z.number().nullable()).optional(),
      us_aqi_carbon_monoxide: z.array(z.number().nullable()).optional(),
      pm2_5: z.array(z.number().nullable()).optional(),
      pm10: z.array(z.number().nullable()).optional(),
      nitrogen_dioxide: z.array(z.number().nullable()).optional(),
      ozone: z.array(z.number().nullable()).optional(),
      sulphur_dioxide: z.array(z.number().nullable()).optional(),
      carbon_monoxide: z.array(z.number().nullable()).optional(),
    })
    .optional(),
});

export const openMeteoGeocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country_code: z.string().optional(),
  country: z.string().optional(),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
  timezone: z.string().optional(),
  population: z.number().optional(),
});

export const openMeteoGeocodingResponseSchema = z.object({
  results: z.array(openMeteoGeocodingResultSchema).optional(),
});

export const routineTimeBlockSchema = z.object({
  window: z.enum(["morning", "midday", "evening"]),
  recommendedActivity: z.string().min(1),
  outdoorSafetyAdvice: z.string().min(1),
  indoorAction: z.string().min(1),
  rationale: z.string().min(1),
});

export const dailyRoutineResponseSchema = z.object({
  headline: z.string().min(1),
  healthProtectionPriority: z.boolean(),
  blocks: z.array(routineTimeBlockSchema).min(1).max(4),
  safetyDisclaimer: z.string().min(1),
});

export const geminiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  locale: localeSchema.default("en"),
  usAqi: z.number().min(0).max(1000).optional(),
  cityName: z.string().trim().max(120).optional(),
  profile: familyProfileSchema.optional(),
});
