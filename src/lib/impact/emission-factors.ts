import type {
  BoundaryCompatibilityNotice,
  CommuteMode,
  EmissionFactorEntry,
} from "@/types/domain";
import { normalizeLegacyCommuteMode } from "@/lib/personalization/profile-storage";

export const EMISSION_FACTOR_REGISTRY_VERSION = "2026.11-audit-v5";

/**
 * Central Electricity Authority (CEA), Ministry of Power, Government of India.
 * CO2 Baseline Database for the Indian Power Sector, User Guide Version 20.0 (Dec 2024).
 * Weighted Average Emission Factor (incl. renewables, FY 2023-24): 0.727 tCO2/MWh = 0.727 kg CO2/kWh.
 */
export const INDIA_GRID_EF_KG_CO2_PER_KWH = 0.727;

/**
 * Audited, versioned emission factor registry.
 * Distinguishes CO2 vs CO2e, direct vs energy-derived EV factors, vehicle-km vs passenger-km,
 * and Tank-to-Wheel vs Scope 2 electricity vs operational-zero boundaries.
 */
export const EMISSION_FACTOR_REGISTRY: Record<
  Exclude<CommuteMode, "walk_cycle">,
  EmissionFactorEntry
> = {
  car_petrol: {
    factorId: "EF_CAR_PETROL_REF_2024",
    mode: "car_petrol",
    category: "private_car",
    labelEn: "Petrol Car",
    labelHi: "पेट्रोल कार",
    numericalFactorKgCo2e: 0.163,
    gasBasis: "CO2e",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0.111, 0.195],
    unit: "kg CO2e/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 5,
    sourceTitle:
      "UK DESNZ GHG Conversion Factors 2024 (Average Petrol Car, Direct TTW) + India GHG Program v1.0 range",
    tableReference:
      "UK DESNZ 2024 Passenger Vehicles Table (Scope 1 TTW Average Petrol Car); India GHG Program v1.0 Passenger Car Table (<1200cc small car ~0.111 kg CO2/km; mid/large 0.15–0.195)",
    sourceUrl:
      "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024",
    publicationYear: 2024,
    geographicApplicability:
      "Mid-size reference estimate (small <1200cc Indian petrol cars emit ~0.111 kg CO2/vkm; larger sedans 0.15–0.195 kg)",
    indianSpecific: false,
    calculationBoundary: "tailpipe_ttw",
    scopeDescription:
      "Direct tailpipe (Tank-to-Wheel) CO2e emissions per vehicle-km, divided by passenger occupancy.",
    limitations:
      "Uses international mid-size CO2e reference where Indian fleet varies widely by engine displacement; excludes Well-to-Tank refining & congestion spikes.",
  },
  car_diesel: {
    factorId: "EF_CAR_DIESEL_REF_2024",
    mode: "car_diesel",
    category: "private_car",
    labelEn: "Diesel Car",
    labelHi: "डीज़ल कार",
    numericalFactorKgCo2e: 0.17,
    gasBasis: "CO2e",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0.13, 0.197],
    unit: "kg CO2e/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 5,
    sourceTitle:
      "UK DESNZ GHG Conversion Factors 2024 (Average Diesel Car, Direct TTW) + India GHG Program v1.0 range",
    tableReference:
      "UK DESNZ 2024 Passenger Vehicles Table (Average Diesel Car); India GHG Program v1.0 Passenger Car Table (diesel 1200–2000cc: 0.13–0.197 kg CO2/km)",
    sourceUrl:
      "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024",
    publicationYear: 2024,
    geographicApplicability:
      "Mid-size diesel car reference estimate consistent with Indian urban diesel sedans/SUVs (0.13–0.197 kg/vkm)",
    indianSpecific: false,
    calculationBoundary: "tailpipe_ttw",
    scopeDescription:
      "Direct tailpipe (Tank-to-Wheel) CO2e emissions per vehicle-km, divided by occupancy.",
    limitations:
      "Tailpipe CO2e only; excludes elevated urban NOx and exhaust PM health burden.",
  },
  car_cng: {
    factorId: "EF_CAR_CNG_IN_V1",
    mode: "car_cng",
    category: "private_car",
    labelEn: "CNG Car",
    labelHi: "सीएनजी कार",
    numericalFactorKgCo2e: 0.068,
    gasBasis: "CO2",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0.063, 0.085],
    unit: "kg CO2/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 5,
    sourceTitle:
      "India GHG Program — India Specific Road Transport Emission Factors v1.0 (WRI India, CII, TERI)",
    tableReference:
      "Passenger Car Emission Factors Table: Small CNG Car (<800–1200cc), base 0.063 kg CO2/km, 0.068 kg CO2/km inclusive of real-world uplift",
    sourceUrl:
      "https://indiaghgp.org/india-specific-road-transport-emission-factors",
    publicationYear: 2015,
    geographicApplicability: "Indian urban compact/small CNG passenger cars",
    indianSpecific: true,
    calculationBoundary: "tailpipe_ttw",
    scopeDescription:
      "Direct tailpipe CO2 per vehicle-km (with uplift factor), divided by confirmed passenger occupancy.",
    limitations:
      "Measures CO2 only (excludes minor CH4/N2O methane slip in CO2e); heavier CNG sedans may exceed the small-car uplift factor.",
  },
  car_electric: {
    factorId: "EF_CAR_EV_IN_CEA20",
    mode: "car_electric",
    category: "private_car",
    labelEn: "Electric Car",
    labelHi: "इलेक्ट्रिक कार",
    numericalFactorKgCo2e: 0.10905,
    gasBasis: "CO2",
    isDerivedEstimate: true,
    uncertaintyRangeKg: [0.0727, 0.1309],
    unit: "kg CO2/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 5,
    sourceTitle:
      "Derived: CEA India CO2 Baseline Database v20.0 (Dec 2024) × Indian e-4W energy benchmark (0.15 kWh/km)",
    tableReference:
      "CEA User Guide v20.0 (FY 2023-24 Weighted Average Grid = 0.727 kg CO2/kWh) × Assumed 0.15 kWh/km urban e-car consumption",
    sourceUrl: "https://cea.nic.in/",
    publicationYear: 2024,
    geographicApplicability:
      "Derived Indian grid-charging estimate (excludes dedicated rooftop solar or certified green tariffs)",
    indianSpecific: true,
    calculationBoundary: "electricity_generation_scope2",
    scopeDescription:
      "Zero tailpipe exhaust; derived transparently as 0.15 kWh/km × 0.727 kg CO2/kWh per vehicle-km, divided by occupancy.",
    limitations:
      "Derived estimate: vehicle efficiency varies (0.10–0.18 kWh/km incl. AC + 10–15% charger losses); battery manufacturing is excluded.",
  },
  two_wheeler: {
    factorId: "EF_2W_PETROL_IN_V1",
    mode: "two_wheeler",
    category: "two_wheeler",
    labelEn: "Petrol Two-Wheeler",
    labelHi: "पेट्रोल दोपहिया वाहन",
    numericalFactorKgCo2e: 0.0387,
    gasBasis: "CO2",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0.029, 0.045],
    unit: "kg CO2/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 2,
    sourceTitle:
      "India GHG Program — India Specific Road Transport Emission Factors v1.0 (WRI India, CII, TERI)",
    tableReference:
      "Two-Wheeler Emission Factors Table: Scooter (<150cc) base 0.0351 kg CO2/km; 0.0387 kg CO2/km with uplift factor",
    sourceUrl:
      "https://indiaghgp.org/india-specific-road-transport-emission-factors",
    publicationYear: 2015,
    geographicApplicability: "Indian urban petrol scooters & motorcycles (<150cc)",
    indianSpecific: true,
    calculationBoundary: "tailpipe_ttw",
    scopeDescription:
      "Direct tailpipe CO2 per vehicle-km with real-world uplift factor, divided by rider occupancy (1 or 2).",
    limitations:
      "Measures CO2 only; open-road two-wheeler riders experience high roadside PM2.5 inhalation during winter smog.",
  },
  two_wheeler_electric: {
    factorId: "EF_2W_EV_IN_CEA20",
    mode: "two_wheeler_electric",
    category: "two_wheeler",
    labelEn: "Electric Two-Wheeler",
    labelHi: "इलेक्ट्रिक दोपहिया वाहन",
    numericalFactorKgCo2e: 0.018175,
    gasBasis: "CO2",
    isDerivedEstimate: true,
    uncertaintyRangeKg: [0.0109, 0.0218],
    unit: "kg CO2/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 2,
    sourceTitle:
      "Derived: CEA India CO2 Baseline v20.0 (Dec 2024) × Indian e-2W midpoint (0.025 kWh/km; NITI Aayog/TIFAC 15–30 Wh/km range)",
    tableReference:
      "CEA User Guide v20.0 (0.727 kg CO2/kWh) × 0.025 kWh/km derived urban e-scooter consumption (NITI Aayog baseline 0.017 kWh/km)",
    sourceUrl: "https://cea.nic.in/",
    publicationYear: 2024,
    geographicApplicability: "Derived Indian grid-charged urban electric two-wheeler estimate",
    indianSpecific: true,
    calculationBoundary: "electricity_generation_scope2",
    scopeDescription:
      "Zero tailpipe exhaust; derived as 0.025 kWh/km × 0.727 kg CO2/kWh per vehicle-km, divided by occupancy.",
    limitations:
      "Derived estimate excluding battery manufacturing; rider remains exposed to open-air ambient smog.",
  },
  carpool: {
    factorId: "EF_CARPOOL_PETROL_REF_2024",
    mode: "carpool",
    category: "shared_carpool",
    labelEn: "Shared Carpool",
    labelHi: "साझा कारपूल",
    numericalFactorKgCo2e: 0.163,
    gasBasis: "CO2e",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0.111, 0.195],
    unit: "kg CO2e/vkm",
    basis: "vehicle_km",
    defaultOccupancy: 3,
    minOccupancy: 2,
    maxOccupancy: 5,
    sourceTitle:
      "UK DESNZ 2024 Average Petrol Car TTW shared across confirmed passenger occupancy",
    tableReference:
      "UK DESNZ 2024 Passenger Vehicles Table (0.163 kg CO2e/vkm ÷ occupancy; minimum 2 occupants)",
    sourceUrl:
      "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024",
    publicationYear: 2024,
    geographicApplicability: "Shared passenger cars carrying 2–5 occupants on an existing route",
    indianSpecific: false,
    calculationBoundary: "tailpipe_ttw",
    scopeDescription:
      "Vehicle-km tailpipe factor divided directly by shared passenger occupancy (2–5).",
    limitations:
      "Assumes ride-sharing replaces separate motorized trips; pickup detour distance is excluded.",
  },
  bus: {
    factorId: "EF_BUS_INTRACITY_IN_V1",
    mode: "bus",
    category: "public_transit",
    labelEn: "Public Intracity Bus",
    labelHi: "सार्वजनिक सिटी बस",
    numericalFactorKgCo2e: 0.015161,
    gasBasis: "CO2",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0.015161, 0.035],
    unit: "kg CO2/pkm",
    basis: "passenger_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 1,
    sourceTitle:
      "India GHG Program — India Specific Road Transport Emission Factors v1.0 (WRI India, TERI, CII)",
    tableReference:
      "Public Transport / Bus Emission Factors: Intracity Bus SRTU weighted average = 0.015161 kg CO2/passenger-km",
    sourceUrl:
      "https://indiaghgp.org/india-specific-road-transport-emission-factors",
    publicationYear: 2015,
    geographicApplicability: "Regular Indian intracity public bus services (excludes BRTS & intercity)",
    indianSpecific: true,
    calculationBoundary: "passenger_transit_operational",
    scopeDescription:
      "Occupancy-weighted passenger-km CO2 factor — never divided by user occupancy again.",
    limitations:
      "Actual load factors vary by route/AC load; UK DESNZ local bus average (~0.102 kg/pkm) reflects lower UK ridership.",
  },
  metro_rail: {
    factorId: "EF_METRO_RAIL_IN_REF",
    mode: "metro_rail",
    category: "public_transit",
    labelEn: "Metro / Urban Rail",
    labelHi: "मेट्रो / शहरी रेल",
    numericalFactorKgCo2e: 0.025,
    gasBasis: "CO2e",
    isDerivedEstimate: true,
    uncertaintyRangeKg: [0.018, 0.04],
    unit: "kg CO2e/pkm",
    basis: "passenger_km",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 1,
    sourceTitle:
      "Indian Urban Rail Grid Reference Benchmark (~0.025 kg CO2e/pkm; CEA Grid v20.0 & UK DESNZ National Rail 0.0355 reference)",
    tableReference:
      "Derived urban metro LCA/operational reference (station + traction load per passenger-km; UK DESNZ National Rail = 0.03546 kg CO2e/pkm comparison)",
    sourceUrl: "https://cea.nic.in/",
    publicationYear: 2024,
    geographicApplicability:
      "Reference estimate for Indian urban metro networks (city operators do not publish uniform pax-km tables)",
    indianSpecific: true,
    calculationBoundary: "electricity_generation_scope2",
    scopeDescription:
      "Passenger-km grid electricity estimate (traction + station auxiliaries) — never divided by occupancy again.",
    limitations:
      "Reference estimate; networks with certified solar procurement (e.g., daytime DMRC solar PPAs) may be lower.",
  },
  walk: {
    factorId: "EF_WALK_ZERO_OP",
    mode: "walk",
    category: "active_or_remote",
    labelEn: "Walking",
    labelHi: "पैदल चलना",
    numericalFactorKgCo2e: 0,
    gasBasis: "zero_operational",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0, 0],
    unit: "kg CO2e/pkm",
    basis: "operational_zero",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 1,
    sourceTitle: "Operational Transport Scope Definition (GHG Protocol Scope 3 Commuting)",
    tableReference: "Zero operational fuel or grid traction electricity boundary",
    sourceUrl: "https://ghgprotocol.org/",
    publicationYear: 2024,
    geographicApplicability: "Universal active travel operational scope",
    indianSpecific: true,
    calculationBoundary: "operational_transport_zero",
    scopeDescription:
      "Zero operational tailpipe or traction electricity emissions (excludes food/metabolic energy).",
    limitations:
      "Suppressed during Unhealthy/Hazardous outdoor AQI episodes in health-priority mode.",
  },
  cycle: {
    factorId: "EF_CYCLE_ZERO_OP",
    mode: "cycle",
    category: "active_or_remote",
    labelEn: "Cycling",
    labelHi: "साइकिल चलाना",
    numericalFactorKgCo2e: 0,
    gasBasis: "zero_operational",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0, 0],
    unit: "kg CO2e/pkm",
    basis: "operational_zero",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 1,
    sourceTitle: "Operational Transport Scope Definition (GHG Protocol Scope 3 Commuting)",
    tableReference: "Zero operational fuel or traction energy boundary",
    sourceUrl: "https://ghgprotocol.org/",
    publicationYear: 2024,
    geographicApplicability: "Universal bicycle operational scope",
    indianSpecific: true,
    calculationBoundary: "operational_transport_zero",
    scopeDescription:
      "Zero operational transport emissions (excludes bicycle manufacturing lifecycle).",
    limitations:
      "Avoid outdoor cycling solely for emissions reduction when ambient US AQI is Unhealthy (>= 151).",
  },
  work_from_home: {
    factorId: "EF_WFH_ZERO_TRANSPORT",
    mode: "work_from_home",
    category: "active_or_remote",
    labelEn: "Remote Work / Study",
    labelHi: "वर्क फ्रॉम होम / ऑनलाइन अध्ययन",
    numericalFactorKgCo2e: 0,
    gasBasis: "zero_operational",
    isDerivedEstimate: false,
    uncertaintyRangeKg: [0, 0],
    unit: "kg CO2e/day",
    basis: "operational_zero",
    defaultOccupancy: 1,
    minOccupancy: 1,
    maxOccupancy: 1,
    sourceTitle: "GHG Protocol Scope 3 Commuting Elimination Boundary",
    tableReference: "Zero operational commute travel boundary",
    sourceUrl: "https://ghgprotocol.org/",
    publicationYear: 2024,
    geographicApplicability: "Universal commute-avoidance operational boundary",
    indianSpecific: true,
    calculationBoundary: "operational_transport_zero",
    scopeDescription:
      "Zero operational road/rail travel emissions when commuting trips are replaced by remote work or study.",
    limitations:
      "Excludes incremental home cooling/heating or laptop electricity shifts compared to an office building.",
  },
};

export function getEmissionFactorForMode(
  mode: CommuteMode
): EmissionFactorEntry {
  const normalized = normalizeLegacyCommuteMode(mode);
  return EMISSION_FACTOR_REGISTRY[normalized];
}

const BOUNDARY_PLAIN_LABELS: Record<
  EmissionFactorEntry["calculationBoundary"],
  { en: string; hi: string }
> = {
  tailpipe_ttw: { en: "direct vehicle tailpipe exhaust", hi: "प्रत्यक्ष वाहन टेलपाइप उत्सर्जन" },
  electricity_generation_scope2: { en: "power-grid electricity generation", hi: "पावर-ग्रिड बिजली उत्पादन" },
  passenger_transit_operational: { en: "per-passenger transit fuel use", hi: "प्रति-यात्री परिवहन ईंधन उपयोग" },
  operational_transport_zero: { en: "zero operational travel", hi: "शून्य परिचालन यात्रा" },
};

export function checkBoundaryCompatibility(
  baseline: EmissionFactorEntry,
  alternative: EmissionFactorEntry
): BoundaryCompatibilityNotice {
  const sameBoundary =
    baseline.calculationBoundary === alternative.calculationBoundary &&
    baseline.gasBasis === alternative.gasBasis;

  if (sameBoundary) {
    return {
      compatible: true,
      sameBoundary: true,
      summaryEn: `Compatible boundary: both options measure ${BOUNDARY_PLAIN_LABELS[baseline.calculationBoundary].en} (${baseline.gasBasis}).`,
      summaryHi: `समान गणना सीमा: दोनों विकल्प ${BOUNDARY_PLAIN_LABELS[baseline.calculationBoundary].hi} (${baseline.gasBasis}) मापते हैं।`,
      baselineBoundary: baseline.calculationBoundary,
      alternativeBoundary: alternative.calculationBoundary,
    };
  }

  return {
    compatible: true,
    sameBoundary: false,
    summaryEn: `Scope note: ${baseline.labelEn} measures ${BOUNDARY_PLAIN_LABELS[baseline.calculationBoundary].en} [${baseline.calculationBoundary}, ${baseline.gasBasis}], whereas ${alternative.labelEn} measures ${BOUNDARY_PLAIN_LABELS[alternative.calculationBoundary].en} [${alternative.calculationBoundary}, ${alternative.gasBasis}]. Vehicle manufacturing and home-energy shifts are excluded.`,
    summaryHi: `सीमा नोट: ${baseline.labelHi} ${BOUNDARY_PLAIN_LABELS[baseline.calculationBoundary].hi} (${baseline.gasBasis}) मापता है, जबकि ${alternative.labelHi} ${BOUNDARY_PLAIN_LABELS[alternative.calculationBoundary].hi} (${alternative.gasBasis}) मापता है। निर्माण जीवनचक्र इसमें शामिल नहीं है।`,
    baselineBoundary: baseline.calculationBoundary,
    alternativeBoundary: alternative.calculationBoundary,
  };
}
