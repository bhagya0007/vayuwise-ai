import { z } from "zod";
import {
  checkBoundaryCompatibility,
  EMISSION_FACTOR_REGISTRY,
  EMISSION_FACTOR_REGISTRY_VERSION,
  getEmissionFactorForMode,
} from "@/lib/impact/emission-factors";
import { commuteModeSchema } from "@/lib/schemas";
import type {
  TransportComparisonResult,
  TransportScenarioInput,
  TransportScenarioResult,
} from "@/types/domain";

export const transportScenarioInputSchema = z.object({
  mode: commuteModeSchema,
  roundTripDistanceKm: z
    .number()
    .finite("Distance must be a finite number.")
    .min(0, "Distance cannot be negative.")
    .max(500, "Daily round-trip distance cannot exceed 500 km."),
  travelDaysPerWeek: z
    .number()
    .int("Travel days must be a whole number.")
    .min(0, "Travel days cannot be negative.")
    .max(7, "Travel days per week cannot exceed 7."),
  workingWeeksPerYear: z
    .number()
    .int("Working weeks must be a whole number.")
    .min(1, "Working weeks per year must be at least 1.")
    .max(52, "Working weeks per year cannot exceed 52."),
  occupancy: z
    .number()
    .int("Occupancy must be a whole number.")
    .min(1, "Occupancy must be at least 1.")
    .max(6, "Occupancy cannot exceed 6 for personal cars.")
    .optional(),
});

function cleanSignedZero(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value;
}

function round4(value: number): number {
  return cleanSignedZero(Math.round(value * 10000) / 10000);
}

function round3(value: number): number {
  return cleanSignedZero(Math.round(value * 1000) / 1000);
}

export function formatSignedCo2eDiff(value: number, decimals: number = 1): string {
  const threshold = Math.pow(10, -(decimals + 1)) * 5;
  if (Math.abs(value) < threshold) {
    return (0).toFixed(decimals);
  }
  const absFormatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value > 0 ? `−${absFormatted}` : `+${absFormatted}`;
}

/**
 * Auditable single-mode emissions calculation:
 * - vehicle_km: Distance * Factor / Occupancy
 * - passenger_km: Distance * Factor (never divided by occupancy again)
 * - operational_zero: 0 kg CO2e
 */
export function calculateTransportScenario(
  input: TransportScenarioInput
): TransportScenarioResult {
  const parsed = transportScenarioInputSchema.parse(input);
  const normalizedMode =
    parsed.mode === "walk_cycle" ? "walk" : parsed.mode;
  const factor = getEmissionFactorForMode(normalizedMode);

  if (!factor) {
    throw new Error(`Unsupported or missing emission factor for mode: ${parsed.mode}`);
  }

  let appliedOccupancy = factor.defaultOccupancy;
  let dailyKgCo2e = 0;
  let formulaDescription = "0 kg CO2e (operational transport zero boundary)";

  if (factor.basis === "vehicle_km") {
    const requestedOcc = parsed.occupancy ?? factor.defaultOccupancy;
    if (
      requestedOcc < factor.minOccupancy ||
      requestedOcc > factor.maxOccupancy
    ) {
      throw new Error(
        `Invalid occupancy ${requestedOcc} for ${factor.labelEn}. Allowed range: ${factor.minOccupancy}–${factor.maxOccupancy}.`
      );
    }
    appliedOccupancy = requestedOcc;
    dailyKgCo2e =
      (parsed.roundTripDistanceKm * factor.numericalFactorKgCo2e) /
      appliedOccupancy;
    formulaDescription = `${parsed.roundTripDistanceKm} km × ${factor.numericalFactorKgCo2e} ${factor.unit} ÷ ${appliedOccupancy} occupant(s)`;
  } else if (factor.basis === "passenger_km") {
    appliedOccupancy = 1; // already embodied inside pax-km factor
    dailyKgCo2e = parsed.roundTripDistanceKm * factor.numericalFactorKgCo2e;
    formulaDescription = `${parsed.roundTripDistanceKm} km × ${factor.numericalFactorKgCo2e} ${factor.unit} (occupancy-weighted passenger-km factor)`;
  } else {
    appliedOccupancy = 1;
    dailyKgCo2e = 0;
  }

  const weeklyKgCo2e = dailyKgCo2e * parsed.travelDaysPerWeek;
  const annualKgCo2e = weeklyKgCo2e * parsed.workingWeeksPerYear;
  const monthlyKgCo2e = annualKgCo2e / 12;

  const lowAnnual =
    factor.basis === "vehicle_km"
      ? ((parsed.roundTripDistanceKm * factor.uncertaintyRangeKg[0]) /
          appliedOccupancy) *
        parsed.travelDaysPerWeek *
        parsed.workingWeeksPerYear
      : factor.basis === "passenger_km"
        ? parsed.roundTripDistanceKm *
          factor.uncertaintyRangeKg[0] *
          parsed.travelDaysPerWeek *
          parsed.workingWeeksPerYear
        : 0;

  const highAnnual =
    factor.basis === "vehicle_km"
      ? ((parsed.roundTripDistanceKm * factor.uncertaintyRangeKg[1]) /
          appliedOccupancy) *
        parsed.travelDaysPerWeek *
        parsed.workingWeeksPerYear
      : factor.basis === "passenger_km"
        ? parsed.roundTripDistanceKm *
          factor.uncertaintyRangeKg[1] *
          parsed.travelDaysPerWeek *
          parsed.workingWeeksPerYear
        : 0;

  return {
    mode: normalizedMode,
    factor,
    roundTripDistanceKm: parsed.roundTripDistanceKm,
    travelDaysPerWeek: parsed.travelDaysPerWeek,
    workingWeeksPerYear: parsed.workingWeeksPerYear,
    appliedOccupancy,
    formulaDescription,
    dailyKgCo2e: round4(dailyKgCo2e),
    weeklyKgCo2e: round3(weeklyKgCo2e),
    monthlyKgCo2e: round3(monthlyKgCo2e),
    annualKgCo2e: round3(annualKgCo2e),
    annualUncertaintyRangeKg: [round3(lowAnnual), round3(highAnnual)],
  };
}

/**
 * Deterministic comparison between Baseline and Alternative transport scenarios.
 * Preserves negative savings cleanly and prevents division-by-zero when baseline == 0.
 */
export function compareTransportScenarios(params: {
  baseline: TransportScenarioInput;
  alternative: TransportScenarioInput;
}): TransportComparisonResult {
  const baseline = calculateTransportScenario(params.baseline);
  const alternative = calculateTransportScenario(params.alternative);

  const avoidedDailyKgCo2e = round4(
    baseline.dailyKgCo2e - alternative.dailyKgCo2e
  );
  const avoidedWeeklyKgCo2e = round3(
    baseline.weeklyKgCo2e - alternative.weeklyKgCo2e
  );
  const avoidedMonthlyKgCo2e = round3(
    baseline.monthlyKgCo2e - alternative.monthlyKgCo2e
  );
  const avoidedAnnualKgCo2e = round3(
    baseline.annualKgCo2e - alternative.annualKgCo2e
  );

  let percentageChange: number | null = null;
  let percentageNote = "";

  if (baseline.annualKgCo2e === 0) {
    percentageChange = null;
    percentageNote =
      alternative.annualKgCo2e === 0
        ? "Zero baseline emissions; both options carry zero operational transport emissions."
        : "Zero baseline emissions; percentage change is undefined (cannot divide by zero).";
  } else {
    percentageChange = round3(
      (avoidedAnnualKgCo2e / baseline.annualKgCo2e) * 100
    );
    percentageNote =
      avoidedAnnualKgCo2e < 0
        ? `Estimated increase of ${Math.abs(percentageChange).toFixed(1)}% compared to baseline.`
        : avoidedAnnualKgCo2e === 0
          ? "No change in estimated operational emissions compared to baseline."
          : `Estimated reduction of ${percentageChange.toFixed(1)}% across ${baseline.workingWeeksPerYear} active weeks.`;
  }

  const boundaryNotice = checkBoundaryCompatibility(
    baseline.factor,
    alternative.factor
  );

  const assumptions = [
    `Round-trip baseline: ${baseline.roundTripDistanceKm} km/day × ${baseline.travelDaysPerWeek} days/week × ${baseline.workingWeeksPerYear} weeks/year.`,
    `Alternative schedule: ${alternative.roundTripDistanceKm} km/day × ${alternative.travelDaysPerWeek} days/week × ${alternative.workingWeeksPerYear} weeks/year.`,
    `Registry version ${EMISSION_FACTOR_REGISTRY_VERSION}: ${baseline.factor.factorId} (${baseline.factor.numericalFactorKgCo2e} ${baseline.factor.unit}) vs ${alternative.factor.factorId} (${alternative.factor.numericalFactorKgCo2e} ${alternative.factor.unit}).`,
  ];

  const limitations = Array.from(
    new Set([
      baseline.factor.limitations,
      alternative.factor.limitations,
      "Emissions savings represent modeled operational CO2e differences, not measured ambient AQI or medical health risk reductions.",
    ])
  );

  return {
    registryVersion: EMISSION_FACTOR_REGISTRY_VERSION,
    baseline,
    alternative,
    avoidedDailyKgCo2e,
    avoidedWeeklyKgCo2e,
    avoidedMonthlyKgCo2e,
    avoidedAnnualKgCo2e,
    percentageChange,
    percentageNote,
    isNegativeSavings: avoidedAnnualKgCo2e < 0,
    boundaryNotice,
    assumptions,
    limitations,
  };
}

export function listSupportedCommuteModes() {
  return Object.values(EMISSION_FACTOR_REGISTRY);
}
