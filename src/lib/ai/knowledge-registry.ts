export type VerifiedSourceId =
  | "WHO_AQG_2021"
  | "US_EPA_AQI"
  | "US_EPA_INDOOR"
  | "MOHFW_INDIA"
  | "NCDC_INDIA"
  | "OPEN_METEO_AQ"
  | "CEA_INDIA_CO2_V20"
  | "INDIA_GHG_TRANSPORT"
  | "UK_DESNZ_GHG_2024";

export interface VerifiedKnowledgeSource {
  id: VerifiedSourceId;
  title: string;
  organization: string;
  url: string;
  summaryGuidance: string;
}

export const VERIFIED_KNOWLEDGE_REGISTRY: Record<
  VerifiedSourceId,
  VerifiedKnowledgeSource
> = {
  WHO_AQG_2021: {
    id: "WHO_AQG_2021",
    title: "WHO Global Air Quality Guidelines",
    organization: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789240034228",
    summaryGuidance:
      "Fine particulate matter (PM2.5) and NO2 increase cardiovascular and respiratory risk; lowering exposure during high pollution episodes protects vulnerable populations.",
  },
  US_EPA_AQI: {
    id: "US_EPA_AQI",
    title: "Air Quality Index (AQI) Basics",
    organization: "US Environmental Protection Agency (AirNow)",
    url: "https://www.airnow.gov/aqi/aqi-basics/",
    summaryGuidance:
      "US AQI classifies 0–50 Good, 51–100 Moderate, 101–150 Unhealthy for Sensitive Groups, 151–200 Unhealthy, 201–300 Very Unhealthy, and 301+ Hazardous. Sensitive groups should reduce prolonged or heavy outdoor exertion starting at 101+, and everyone should reduce exertion at 151+.",
  },
  US_EPA_INDOOR: {
    id: "US_EPA_INDOOR",
    title: "Guide to Air Cleaners in the Home",
    organization: "US Environmental Protection Agency",
    url: "https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home",
    summaryGuidance:
      "Source control, targeted ventilation, and mechanical HEPA/MERV filtration reduce indoor particulates. Avoid ozone-generating air cleaners; houseplants do not replace mechanical filtration.",
  },
  MOHFW_INDIA: {
    id: "MOHFW_INDIA",
    title: "Air Pollution & Health Advisory Portal",
    organization: "Ministry of Health and Family Welfare, India",
    url: "https://mohfw.gov.in/",
    summaryGuidance:
      "During severe smog, children, pregnant individuals, older adults, and people with respiratory/cardiac conditions should minimize outdoor exertion and seek medical care for acute symptoms.",
  },
  NCDC_INDIA: {
    id: "NCDC_INDIA",
    title: "National Programme on Climate Change & Human Health",
    organization: "National Centre for Disease Control, India",
    url: "https://ncdc.mohfw.gov.in/",
    summaryGuidance:
      "Avoid burning biomass/waste, keep rescue medications handy for chronic respiratory conditions, and prefer indoor clean-air spaces during winter inversion peaks.",
  },
  OPEN_METEO_AQ: {
    id: "OPEN_METEO_AQ",
    title: "Open-Meteo Air Quality API (CAMS Modeling)",
    organization: "Open-Meteo",
    url: "https://open-meteo.com/en/docs/air-quality-api",
    summaryGuidance:
      "Open-Meteo provides regional Copernicus CAMS modeled US AQI and hourly pollutant forecasts; modeled grid estimates differ from official Indian CPCB ground monitoring stations.",
  },
  CEA_INDIA_CO2_V20: {
    id: "CEA_INDIA_CO2_V20",
    title: "CO2 Baseline Database for the Indian Power Sector (Version 20.0, Dec 2024)",
    organization: "Central Electricity Authority (Ministry of Power, India)",
    url: "https://cea.nic.in/",
    summaryGuidance:
      "Reports an All-India weighted average grid emission factor of 0.727 kg CO2/kWh (FY 2023-24) used for transparent Scope 2 electric vehicle and urban rail electricity calculations.",
  },
  INDIA_GHG_TRANSPORT: {
    id: "INDIA_GHG_TRANSPORT",
    title: "India Specific Road Transport Emission Factors (Version 1.0)",
    organization: "India GHG Program (WRI India, CII, TERI)",
    url: "https://indiaghgp.org/india-specific-road-transport-emission-factors",
    summaryGuidance:
      "Provides documented India-specific road transport factors including CNG small cars (~0.068 kg CO2/vkm), petrol two-wheelers (~0.0387 kg CO2/vkm), and intracity buses (~0.015161 kg CO2/pkm).",
  },
  UK_DESNZ_GHG_2024: {
    id: "UK_DESNZ_GHG_2024",
    title: "Greenhouse Gas Reporting: Conversion Factors 2024",
    organization: "UK Department for Energy Security and Net Zero (DESNZ)",
    url: "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024",
    summaryGuidance:
      "Provides peer-reviewed vehicle-km and passenger-km conversion references for average petrol (~0.163 kg CO2e/vkm) and diesel (~0.170 kg CO2e/vkm) cars where unified India fleet averages vary.",
  },
} as const;

export const VERIFIED_SOURCE_IDS = Object.keys(
  VERIFIED_KNOWLEDGE_REGISTRY
) as VerifiedSourceId[];

/**
 * Resolves model-returned citation identifiers strictly against the verified
 * application registry, discarding arbitrary or hallucinated references.
 */
export function resolveVerifiedCitations(
  candidateIds: readonly string[] | undefined | null
): VerifiedKnowledgeSource[] {
  if (!candidateIds || candidateIds.length === 0) {
    return [VERIFIED_KNOWLEDGE_REGISTRY.WHO_AQG_2021, VERIFIED_KNOWLEDGE_REGISTRY.US_EPA_AQI];
  }

  const seen = new Set<VerifiedSourceId>();
  const resolved: VerifiedKnowledgeSource[] = [];

  for (const rawId of candidateIds) {
    const normalized = rawId.trim().toUpperCase() as VerifiedSourceId;
    if (normalized in VERIFIED_KNOWLEDGE_REGISTRY && !seen.has(normalized)) {
      seen.add(normalized);
      resolved.push(VERIFIED_KNOWLEDGE_REGISTRY[normalized]);
    }
  }

  if (resolved.length === 0) {
    return [VERIFIED_KNOWLEDGE_REGISTRY.WHO_AQG_2021, VERIFIED_KNOWLEDGE_REGISTRY.US_EPA_AQI];
  }

  return resolved;
}

export function formatKnowledgeContextForPrompt(): string {
  return Object.values(VERIFIED_KNOWLEDGE_REGISTRY)
    .map((s) => `[${s.id}] ${s.title} (${s.organization}): ${s.summaryGuidance}`)
    .join("\n");
}
