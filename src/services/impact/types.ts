import type {
  CommuteMode,
  DeterministicImpactEstimate,
} from "@/types/domain";

export interface CommuteComparisonInput {
  baselineMode: CommuteMode;
  alternativeMode: CommuteMode;
  roundTripKm: number;
  daysPerWeek: number;
  ambientUsAqi: number;
  ambientPm25UgM3: number | null;
}

export interface ImpactCalculatorService {
  calculateCommuteImpact(
    input: CommuteComparisonInput
  ): DeterministicImpactEstimate;
}
