import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { normalizeLegacyCommuteMode } from "@/lib/personalization/profile-storage";
import type { CommuteMode, TransportComparisonResult } from "@/types/domain";

type SupportedMode = Exclude<CommuteMode, "walk_cycle">;

const COMMUTE_DOMAINS = new Set(["daily_commute", "school_college_travel"]);

const NON_TRANSPORT_ACTIVITY_PATTERN =
  /\b(indoor exercise|indoor physical|indoor play|quiet play|stay indoors|indoor workout|home workout|outdoor play|morning walk|evening walk|outdoor walk|outdoor run|jogging|ventilat|open window|close window|seal window|seal gap|exhaust fan|kitchen exhaust|hepa|air purifier|air cleaner|incense|dhoop|candle|mosquito coil|damp[- ]?mop|wet[- ]?mop|cooking|biomass|stubble|waste burning|compost|respirator|n95|ffp2)\b/i;

const GENERIC_PRIVATE_COMMUTE_PATTERN =
  /\b(car|petrol|diesel|cng|two[- ]?wheeler|scooter|motorbike|motorcycle|cab|taxi|auto|driving|drive|solo commute|private vehicle|daily commute|office commute|school run|school drop)\b/i;

function detectExplicitMode(text: string): SupportedMode | null {
  const lower = text.toLowerCase();

  // Check explicit non-motorized walk/cycle legs first (e.g. "walking to metro station" is walk, not metro_rail)
  if (/\b(walk to work|walking commute|walk to station|walking to metro|walk to school|walking to school)\b/.test(lower)) {
    return "walk";
  }
  if (/\b(cycle commute|cycling commute|bicycle commute|cycle to work|cycling to metro|ride a bicycle)\b/.test(lower)) {
    return "cycle";
  }
  // Remote work / commute elimination
  if (
    /\b(work from home|working from home|wfh|remote work|remote study|online class|telecommute)\b/.test(
      lower
    )
  ) {
    return "work_from_home";
  }
  // Carpool / rideshare
  if (/\b(carpool|car[- ]?pool|ride[- ]?share|shared cab|shared car|shared ride)\b/.test(lower)) {
    return "carpool";
  }
  // Metro / urban rail
  if (/\b(metro|urban rail|subway|mrt|rapid rail|commuter rail)\b/.test(lower)) {
    return "metro_rail";
  }
  // Public intracity bus (exclude unrelated strings; must name bus transit)
  if (/\b(public bus|city bus|intracity bus|feeder bus|ac bus|bus transit|local bus|bus)\b/.test(lower)) {
    return "bus";
  }
  // Electric vehicles (strictly 4W car or 2W scooter/motorcycle; excludes e-rickshaw without registry factor)
  if (/\b(electric car|ev car|electric four[- ]?wheeler|e[- ]?car)\b/.test(lower)) {
    return "car_electric";
  }
  if (/\b(electric two[- ]?wheeler|electric scooter|electric motorcycle|e[- ]?scooter|e[- ]?2w)\b/.test(lower)) {
    return "two_wheeler_electric";
  }
  // Conventional motorized vehicles
  if (/\b(diesel car|diesel sedan|diesel suv)\b/.test(lower)) {
    return "car_diesel";
  }
  if (/\b(cng car|cng cab|cng vehicle)\b/.test(lower)) {
    return "car_cng";
  }
  if (/\b(petrol car|gasoline car|private car|personal car|car)\b/.test(lower)) {
    return "car_petrol";
  }
  if (/\b(two[- ]?wheeler|petrol scooter|scooter|motorbike|motorcycle)\b/.test(lower)) {
    return "two_wheeler";
  }

  return null;
}

export interface SustainabilitySwapEvaluation {
  quantified: boolean;
  reasonIfUnquantified?:
    | "non_commute_domain"
    | "non_transport_activity"
    | "missing_distance"
    | "unrecognized_alternative_mode"
    | "missing_or_zero_baseline"
    | "same_mode"
    | "no_emissions_reduction";
  baselineMode?: SupportedMode;
  alternativeMode?: SupportedMode;
  comparison?: TransportComparisonResult;
  gasUnitLabel?: "kg CO₂e" | "kg CO₂";
}

/**
 * Strictly validates whether a sustainability recommendation represents an
 * identifiable motorized transport replacement with audited emission factors
 * and an applicable commute distance. Never invents savings for indoor exercise,
 * outdoor play, ventilation, or unrecognized transport modes.
 */
export function evaluateSustainabilityTransportSwap(params: {
  domain: string;
  currentActivity: string;
  suggestedAlternative: string;
  profilePrimaryCommute: CommuteMode;
  dailyCommuteKm: number;
  commuteDaysPerWeek?: number;
  workingWeeksPerYear?: number;
  vehicleOccupancy?: number;
}): SustainabilitySwapEvaluation {
  if (!COMMUTE_DOMAINS.has(params.domain)) {
    return { quantified: false, reasonIfUnquantified: "non_commute_domain" };
  }

  if (!Number.isFinite(params.dailyCommuteKm) || params.dailyCommuteKm <= 0) {
    return { quantified: false, reasonIfUnquantified: "missing_distance" };
  }

  const altText = params.suggestedAlternative.trim();
  const currText = params.currentActivity.trim();

  // Reject non-transport health/indoor actions (unless clearly remote work replacing a motorized commute)
  const altMode = detectExplicitMode(altText);
  if (!altMode) {
    return {
      quantified: false,
      reasonIfUnquantified: NON_TRANSPORT_ACTIVITY_PATTERN.test(altText)
        ? "non_transport_activity"
        : "unrecognized_alternative_mode",
    };
  }

  if (NON_TRANSPORT_ACTIVITY_PATTERN.test(altText) && altMode !== "work_from_home") {
    return { quantified: false, reasonIfUnquantified: "non_transport_activity" };
  }

  // Determine baseline mode without inventing savings for walking/outdoor play
  const explicitBaseline = detectExplicitMode(currText);
  let baselineMode: SupportedMode | null = explicitBaseline;

  if (!baselineMode) {
    if (NON_TRANSPORT_ACTIVITY_PATTERN.test(currText)) {
      return { quantified: false, reasonIfUnquantified: "non_transport_activity" };
    }
    if (GENERIC_PRIVATE_COMMUTE_PATTERN.test(currText)) {
      const normalizedProfile = normalizeLegacyCommuteMode(params.profilePrimaryCommute);
      baselineMode = normalizedProfile;
    }
  }

  if (
    !baselineMode ||
    baselineMode === "walk" ||
    baselineMode === "cycle" ||
    baselineMode === "work_from_home"
  ) {
    return { quantified: false, reasonIfUnquantified: "missing_or_zero_baseline" };
  }

  if (baselineMode === altMode) {
    return { quantified: false, reasonIfUnquantified: "same_mode" };
  }

  const comparison = compareTransportScenarios({
    baseline: {
      mode: baselineMode,
      roundTripDistanceKm: params.dailyCommuteKm,
      travelDaysPerWeek: params.commuteDaysPerWeek ?? 5,
      workingWeeksPerYear: params.workingWeeksPerYear ?? 48,
      occupancy: params.vehicleOccupancy ?? 1,
    },
    alternative: {
      mode: altMode,
      roundTripDistanceKm: params.dailyCommuteKm,
      travelDaysPerWeek: params.commuteDaysPerWeek ?? 5,
      workingWeeksPerYear: params.workingWeeksPerYear ?? 48,
      occupancy: altMode === "carpool" ? 3 : 1,
    },
  });

  if (comparison.avoidedAnnualKgCo2e <= 0) {
    return { quantified: false, reasonIfUnquantified: "no_emissions_reduction" };
  }

  const gasUnitLabel =
    comparison.baseline.factor.gasBasis === "CO2" &&
    comparison.alternative.factor.gasBasis === "CO2"
      ? "kg CO₂"
      : "kg CO₂e";

  return {
    quantified: true,
    baselineMode,
    alternativeMode: altMode,
    comparison,
    gasUnitLabel,
  };
}
