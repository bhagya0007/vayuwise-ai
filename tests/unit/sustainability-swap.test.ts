// @vitest-environment node
import { describe, expect, test } from "vitest";
import { addActivityRecord, summarizeActivities } from "@/lib/impact/activity-tracker";
import { evaluateSustainabilityTransportSwap } from "@/lib/impact/sustainability-swap";

describe("Sustainability Transport Replacement Guardrails", () => {
  test("never infers metro travel from school_college_travel or quantifies outdoor play / indoor activity", () => {
    const res = evaluateSustainabilityTransportSwap({
      domain: "school_college_travel",
      currentActivity: "Outdoor morning walk or play",
      suggestedAlternative: "Indoor physical activity or quiet play",
      profilePrimaryCommute: "car_petrol",
      dailyCommuteKm: 14,
      commuteDaysPerWeek: 5,
      workingWeeksPerYear: 48,
      vehicleOccupancy: 1,
    });

    expect(res.quantified).toBe(false);
    expect(res.comparison).toBeUndefined();
  });

  test("never quantifies ventilation, indoor exercise, air purifiers, or zero commute distance", () => {
    const ventilation = evaluateSustainabilityTransportSwap({
      domain: "daily_commute",
      currentActivity: "Driving a petrol car",
      suggestedAlternative: "Keep windows sealed and use HEPA air purifier",
      profilePrimaryCommute: "car_petrol",
      dailyCommuteKm: 14,
    });
    expect(ventilation.quantified).toBe(false);

    const zeroDistance = evaluateSustainabilityTransportSwap({
      domain: "daily_commute",
      currentActivity: "Daily solo petrol car commute",
      suggestedAlternative: "Switch to Metro rail",
      profilePrimaryCommute: "car_petrol",
      dailyCommuteKm: 0,
    });
    expect(zeroDistance.quantified).toBe(false);
    expect(zeroDistance.reasonIfUnquantified).toBe("missing_distance");

    const walkingBaseline = evaluateSustainabilityTransportSwap({
      domain: "daily_commute",
      currentActivity: "Walking to metro station",
      suggestedAlternative: "Use enclosed feeder bus",
      profilePrimaryCommute: "car_petrol",
      dailyCommuteKm: 14,
    });
    expect(walkingBaseline.quantified).toBe(false);
  });

  test("quantifies genuine motorized replacement with audited gas basis and source references", () => {
    const res = evaluateSustainabilityTransportSwap({
      domain: "daily_commute",
      currentActivity: "Daily solo petrol car commute",
      suggestedAlternative: "Switch to Delhi Metro / Urban Rail",
      profilePrimaryCommute: "car_petrol",
      dailyCommuteKm: 14,
      commuteDaysPerWeek: 5,
      workingWeeksPerYear: 48,
      vehicleOccupancy: 1,
    });

    expect(res.quantified).toBe(true);
    expect(res.baselineMode).toBe("car_petrol");
    expect(res.alternativeMode).toBe("metro_rail");
    expect(res.gasUnitLabel).toBe("kg CO₂e");
    expect(res.comparison?.avoidedAnnualKgCo2e).toBeGreaterThan(400);
    expect(res.comparison?.baseline.factor.factorId).toBe("EF_CAR_PETROL_REF_2024");
    expect(res.comparison?.alternative.factor.factorId).toBe("EF_METRO_RAIL_IN_REF");
    expect(res.comparison?.baseline.factor.calculationBoundary).toBe("tailpipe_ttw");
    expect(res.comparison?.alternative.factor.calculationBoundary).toBe(
      "electricity_generation_scope2"
    );

    // Pure CO2 comparison (two_wheeler CO2 -> bus CO2)
    const co2Swap = evaluateSustainabilityTransportSwap({
      domain: "daily_commute",
      currentActivity: "Petrol two-wheeler scooter ride",
      suggestedAlternative: "Take public intracity bus",
      profilePrimaryCommute: "two_wheeler",
      dailyCommuteKm: 10,
    });
    expect(co2Swap.quantified).toBe(true);
    expect(co2Swap.gasUnitLabel).toBe("kg CO₂");
  });

  test("activity tracker stores null savings when swap is unquantified", () => {
    const unquantified = evaluateSustainabilityTransportSwap({
      domain: "school_college_travel",
      currentActivity: "Outdoor morning walk or play",
      suggestedAlternative: "Indoor physical activity or quiet play",
      profilePrimaryCommute: "car_petrol",
      dailyCommuteKm: 14,
    });

    const outcome = addActivityRecord([], {
      activityType: "indoor_air_action",
      title: "Indoor physical activity or quiet play",
      dedupeKey: "sust:test-unquantified",
      baselineMode: unquantified.quantified ? unquantified.baselineMode : undefined,
      alternativeMode: unquantified.quantified ? unquantified.alternativeMode : undefined,
      distanceKm: unquantified.quantified ? 14 : undefined,
    });

    expect(outcome.added).toBe(true);
    expect(outcome.record?.calculatedSavingsKgCo2e).toBeNull();
    expect(outcome.record?.emissionFactorVersion).toBeNull();

    const summary = summarizeActivities(outcome.records, new Date());
    expect(summary.dailySavingsKgCo2e).toBe(0);
    expect(summary.weeklySavingsKgCo2e).toBe(0);
  });
});
