import { z } from "zod";
import {
  budgetTierSchema,
  familyProfileSchema,
  geoLocationSchema,
  localeSchema,
} from "@/lib/schemas";
import { VERIFIED_SOURCE_IDS } from "@/lib/ai/knowledge-registry";

export const verifiedSourceIdSchema = z.enum(
  VERIFIED_SOURCE_IDS as [
    "WHO_AQG_2021",
    "US_EPA_AQI",
    "US_EPA_INDOOR",
    "MOHFW_INDIA",
    "NCDC_INDIA",
    "OPEN_METEO_AQ",
    "CEA_INDIA_CO2_V20",
    "INDIA_GHG_TRANSPORT",
    "UK_DESNZ_GHG_2024",
  ]
);

export const relativeCostSchema = z.enum(["free", "low_cost", "investment"]);
export const effortLevelSchema = z.enum(["low", "moderate", "high"]);

/**
 * Reusable structured recommendation contract returned by Gemini
 * and validated with Zod prior to deterministic safety verification.
 */
export const structuredRecommendationSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  suggestedAction: z.string().min(1).max(500),
  whyItMatters: z.string().min(1).max(400),
  suggestedTiming: z.string().min(1).max(160),
  expectedQualitativeBenefit: z.string().min(1).max(320),
  practicalAlternative: z.string().min(1).max(320),
  relativeCost: relativeCostSchema,
  effortLevel: effortLevelSchema,
  caution: z.string().min(1).max(320),
  sourceIds: z.array(z.string().min(1)).min(1).max(4),
  dataBasis: z.string().min(1).max(200),
  whyThisRecommendation: z.string().min(1).max(400),
});

export type StructuredRecommendation = z.infer<
  typeof structuredRecommendationSchema
>;

const baseAiLocationSchema = geoLocationSchema.pick({
  id: true,
  name: true,
  region: true,
  country: true,
  countryCode: true,
  latitude: true,
  longitude: true,
  timezone: true,
});

// ---------------------------------------------------------------------------
// 1. AI Chat
// ---------------------------------------------------------------------------
export const aiChatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1500),
});

export const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  history: z.array(aiChatHistoryItemSchema).max(10).default([]),
  locale: localeSchema.default("en"),
  location: baseAiLocationSchema,
  profile: familyProfileSchema.optional(),
});

export const aiChatResponseSchema = z.object({
  reply: z.string().min(1).max(2000),
  recommendations: z.array(structuredRecommendationSchema).max(3).default([]),
  cautions: z.array(z.string().min(1).max(300)).max(4).default([]),
  sourceIds: z.array(z.string().min(1)).min(1).max(5),
  dataBasis: z.string().min(1).max(220),
  whyThisRecommendation: z.string().min(1).max(400),
  disclaimer: z.string().min(1).max(300),
});

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

// ---------------------------------------------------------------------------
// 2. AI Daily Planner (6 chronological blocks)
// ---------------------------------------------------------------------------
export const plannerWindowSchema = z.enum([
  "early_morning",
  "morning_commute",
  "midday",
  "afternoon",
  "evening",
  "night",
]);

export const aiDailyPlanRequestSchema = z.object({
  locale: localeSchema.default("en"),
  location: baseAiLocationSchema,
  profile: familyProfileSchema.optional(),
  scheduleNote: z.string().trim().max(300).optional(),
});

export const plannerSlotSchema = z.object({
  window: plannerWindowSchema,
  timeRange: z.string().min(1).max(64),
  title: z.string().min(1).max(140),
  whatToDo: z.string().min(1).max(380),
  whenToDoIt: z.string().min(1).max(160),
  whyRecommended: z.string().min(1).max(360),
  expectedBenefit: z.string().min(1).max(280),
  alternativeAction: z.string().min(1).max(300),
  healthPriority: z.boolean(),
  caution: z.string().min(1).max(280),
  sourceIds: z.array(z.string().min(1)).min(1).max(3),
  whyThisRecommendation: z.string().min(1).max(360),
});

export const aiDailyPlanResponseSchema = z.object({
  headline: z.string().min(1).max(200),
  healthProtectionPriority: z.boolean(),
  dataBasis: z.string().min(1).max(220),
  personalizationBasis: z.string().min(1).max(220),
  slots: z.array(plannerSlotSchema).min(4).max(6),
  sourceIds: z.array(z.string().min(1)).min(1).max(5),
  disclaimer: z.string().min(1).max(300),
});

export type AiDailyPlanRequest = z.infer<typeof aiDailyPlanRequestSchema>;
export type AiDailyPlanResponse = z.infer<typeof aiDailyPlanResponseSchema>;

// ---------------------------------------------------------------------------
// 3. AI Indoor Air Coach
// ---------------------------------------------------------------------------
export const indoorRoomTypeSchema = z.enum([
  "living_room",
  "bedroom",
  "kitchen",
  "study_work",
  "whole_home",
]);

export const aiIndoorAirRequestSchema = z.object({
  locale: localeSchema.default("en"),
  location: baseAiLocationSchema,
  profile: familyProfileSchema.optional(),
  roomFocus: indoorRoomTypeSchema.default("whole_home"),
  cookingStyle: z
    .enum(["lpg_gas", "electric_induction", "mixed", "solid_fuel_nearby"])
    .default("lpg_gas"),
  budgetTier: budgetTierSchema.optional(),
  hasPurifier: z.boolean().optional(),
  indoorSmokeNote: z.string().trim().max(240).optional(),
});

export const indoorRoomCardSchema = z.object({
  id: z.string().min(1).max(64),
  room: indoorRoomTypeSchema,
  sourceCategory: z.enum([
    "cooking_smoke",
    "outdoor_infiltration",
    "dust_resuspension",
    "indoor_combustion",
    "filtration",
  ]),
  title: z.string().min(1).max(160),
  suggestedAction: z.string().min(1).max(400),
  whyItMatters: z.string().min(1).max(360),
  ventilationGuidance: z.string().min(1).max(280),
  relativeCost: relativeCostSchema,
  effortLevel: effortLevelSchema,
  caution: z.string().min(1).max(280),
  sourceIds: z.array(z.string().min(1)).min(1).max(3),
  whyThisRecommendation: z.string().min(1).max(360),
});

export const aiIndoorAirResponseSchema = z.object({
  headline: z.string().min(1).max(200),
  ventilationSummary: z.string().min(1).max(360),
  dataBasis: z.string().min(1).max(220),
  cards: z.array(indoorRoomCardSchema).min(3).max(6),
  avoidList: z.array(z.string().min(1).max(240)).min(1).max(4),
  sourceIds: z.array(z.string().min(1)).min(1).max(5),
  disclaimer: z.string().min(1).max(300),
});

export type AiIndoorAirRequest = z.infer<typeof aiIndoorAirRequestSchema>;
export type AiIndoorAirResponse = z.infer<typeof aiIndoorAirResponseSchema>;

// ---------------------------------------------------------------------------
// 4. AI Sustainability Coach
// ---------------------------------------------------------------------------
export const sustainabilityFocusSchema = z.enum([
  "all",
  "daily_commute",
  "school_college_travel",
  "household_energy",
  "waste_practices",
  "community_sustainability",
]);

export const aiSustainabilityRequestSchema = z.object({
  locale: localeSchema.default("en"),
  location: baseAiLocationSchema,
  profile: familyProfileSchema.optional(),
  focusArea: sustainabilityFocusSchema.default("all"),
  budgetTier: budgetTierSchema.optional(),
});

export const sustainabilityOptionSchema = z.object({
  id: z.string().min(1).max(64),
  domain: sustainabilityFocusSchema,
  currentActivity: z.string().min(1).max(200),
  suggestedAlternative: z.string().min(1).max(360),
  feasibility: z.enum(["high", "medium", "conditional"]),
  relativeCost: relativeCostSchema,
  qualitativeEnvironmentalBenefit: z.string().min(1).max(340),
  healthAndPracticalTradeOff: z.string().min(1).max(340),
  sourceIds: z.array(z.string().min(1)).min(1).max(3),
  whyThisRecommendation: z.string().min(1).max(360),
});

export const aiSustainabilityResponseSchema = z.object({
  headline: z.string().min(1).max(200),
  healthPriorityNote: z.string().min(1).max(320),
  dataBasis: z.string().min(1).max(220),
  alternatives: z.array(sustainabilityOptionSchema).min(3).max(6),
  sourceIds: z.array(z.string().min(1)).min(1).max(5),
  disclaimer: z.string().min(1).max(300),
});

export type AiSustainabilityRequest = z.infer<typeof aiSustainabilityRequestSchema>;
export type AiSustainabilityResponse = z.infer<typeof aiSustainabilityResponseSchema>;

// ---------------------------------------------------------------------------
// 5. AI Community Action Planner
// ---------------------------------------------------------------------------
export const communityTypeSchema = z.enum([
  "residential_society",
  "school",
  "college",
  "workplace",
  "neighborhood_group",
]);

export const aiCommunityPlanRequestSchema = z.object({
  locale: localeSchema.default("en"),
  location: baseAiLocationSchema,
  communityType: communityTypeSchema.default("residential_society"),
  approxPopulation: z.number().int().min(10).max(50000).default(250),
  budgetTier: budgetTierSchema.default("low_cost"),
  timeframe: z.enum(["immediate_48h", "weekly", "winter_season"]).default("weekly"),
  availableResources: z.string().trim().max(300).optional(),
});

export const aiCommunityPlanResponseSchema = z.object({
  headline: z.string().min(1).max(200),
  dataBasis: z.string().min(1).max(220),
  immediateActions: z.array(z.string().min(1).max(280)).min(2).max(5),
  weeklyActions: z.array(z.string().min(1).max(280)).min(2).max(5),
  longTermActions: z.array(z.string().min(1).max(280)).min(2).max(5),
  responsibilityCategories: z.array(z.string().min(1).max(200)).min(2).max(5),
  expectedQualitativeOutcomes: z.array(z.string().min(1).max(260)).min(2).max(4),
  implementationChecklist: z.array(z.string().min(1).max(260)).min(3).max(6),
  healthAndSafetyNotes: z.array(z.string().min(1).max(280)).min(2).max(4),
  whyThisRecommendation: z.string().min(1).max(400),
  sourceIds: z.array(z.string().min(1)).min(1).max(5),
  disclaimer: z.string().min(1).max(300),
});

export type AiCommunityPlanRequest = z.infer<typeof aiCommunityPlanRequestSchema>;
export type AiCommunityPlanResponse = z.infer<typeof aiCommunityPlanResponseSchema>;

// ---------------------------------------------------------------------------
// 6. AI Impact Explanation (Grounded strictly in deterministic engine math)
// ---------------------------------------------------------------------------
export const aiImpactScenarioInputSchema = z.object({
  mode: z.enum([
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
  ]),
  roundTripDistanceKm: z.number().finite().min(0).max(500),
  travelDaysPerWeek: z.number().int().min(0).max(7),
  workingWeeksPerYear: z.number().int().min(1).max(52),
  occupancy: z.number().int().min(1).max(6).optional(),
});

export const aiImpactExplainRequestSchema = z.object({
  locale: localeSchema.default("en"),
  location: baseAiLocationSchema,
  profile: familyProfileSchema.optional(),
  baseline: aiImpactScenarioInputSchema,
  alternative: aiImpactScenarioInputSchema,
  exposureNote: z.string().trim().max(320).optional(),
});

export const aiImpactExplainResponseSchema = z.object({
  headline: z.string().min(1).max(200),
  whatItMeans: z.string().min(1).max(900),
  practicalTradeOffs: z.string().min(1).max(450),
  exposureVsClimateNote: z.string().min(1).max(360),
  nextSteps: z.array(z.string().min(1).max(260)).min(2).max(4),
  whyThisRecommendation: z.string().min(1).max(400),
  dataBasis: z.string().min(1).max(260),
  sourceIds: z.array(z.string().min(1)).min(1).max(6),
  disclaimer: z.string().min(1).max(300),
});

export type AiImpactExplainRequest = z.infer<typeof aiImpactExplainRequestSchema>;
export type AiImpactExplainResponse = z.infer<typeof aiImpactExplainResponseSchema>;
