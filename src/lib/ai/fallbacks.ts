import type {
  AiChatResponse,
  AiCommunityPlanResponse,
  AiDailyPlanResponse,
  AiImpactExplainResponse,
  AiIndoorAirResponse,
  AiSustainabilityResponse,
} from "@/lib/ai/schemas";
import type { GeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import type { Locale, TransportComparisonResult } from "@/types/domain";

/**
 * Deterministic rule-based fallbacks when Gemini is unconfigured or unavailable.
 * Always served with `aiGenerated: false` so UI never mistakes them for Gemini output.
 */
export function buildDeterministicChatFallback(
  ctx: GeminiAirQualityContext,
  locale: Locale
): AiChatResponse {
  const isHi = locale === "hi";
  const aqiText =
    ctx.current.usAqi !== null ? `${Math.round(ctx.current.usAqi)} US AQI` : "unavailable";

  return {
    reply: isHi
      ? `नियम-आधारित मार्गदर्शन (Gemini AI नहीं): ${ctx.location.name} में वर्तमान मॉडल्ड स्तर ${aqiText} (${ctx.current.severityLabel}) है। ${ctx.deterministicGuidance.headline}। ${ctx.deterministicGuidance.recommendedPrimaryAction}`
      : `Deterministic Rule-Based Guidance (Not Gemini AI): Current modeled air quality in ${ctx.location.name} is ${aqiText} (${ctx.current.severityLabel}). ${ctx.deterministicGuidance.headline}. ${ctx.deterministicGuidance.recommendedPrimaryAction}`,
    recommendations: [
      {
        id: "det-chat-1",
        category: "health_protection",
        title: isHi ? "प्राथमिक सुरक्षा कदम" : "Primary Protection Step",
        suggestedAction: ctx.deterministicGuidance.recommendedPrimaryAction,
        whyItMatters: isHi
          ? "मॉडल्ड कण स्तर और घरेलू संवेदनशीलता के आधार पर नियम-आधारित सुरक्षा।"
          : "Rule-based precaution grounded in current modeled particulate severity and household profile.",
        suggestedTiming:
          ctx.relativelyLowerWindow.available && ctx.relativelyLowerWindow.startIso
            ? `Lower dispersion window near ${ctx.relativelyLowerWindow.startIso.slice(11, 16)} UTC`
            : isHi
              ? "दिनभर सतर्क रहें"
              : "Apply throughout peak morning/evening hours",
        expectedQualitativeBenefit: isHi
          ? "तीव्र कण-संपर्क कम करने में मदद।"
          : "Helps reduce acute respiratory particulate exposure.",
        practicalAlternative: isHi
          ? "इनडोर गतिविधियां और बंद सार्वजनिक परिवहन चुनें।"
          : "Choose indoor alternatives and enclosed metro/bus transit.",
        relativeCost: "free",
        effortLevel: "low",
        caution:
          ctx.provenance.staleWarning ??
          (isHi
            ? "क्षेत्रीय मॉडल मान स्थानीय सड़क प्रदूषण से भिन्न हो सकते हैं।"
            : "Regional modeled data may differ from street-level traffic pollution."),
        sourceIds: ["WHO_AQG_2021", "US_EPA_AQI"],
        dataBasis: `${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`,
        whyThisRecommendation: isHi
          ? "Gemini उपलब्ध न होने पर भी सुरक्षित नियम-आधारित मार्गदर्शन।"
          : "Deterministic baseline shown because live Gemini AI is not active.",
      },
    ],
    cautions: [
      isHi
        ? "यह नियम-आधारित बैकअप है, Gemini AI उत्तर नहीं।"
        : "This is deterministic rule-based guidance, not a Gemini AI response.",
    ],
    sourceIds: ["WHO_AQG_2021", "US_EPA_AQI", "OPEN_METEO_AQ"],
    dataBasis: `${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`,
    whyThisRecommendation: isHi
      ? "सर्वर पर उपलब्ध पर्यावरणीय डेटा और सुरक्षा नियमों से तैयार।"
      : "Generated deterministically from server air quality context and public-health rules.",
    disclaimer: isHi
      ? "यह चिकित्सीय निदान या उपचार सलाह नहीं है। गंभीर लक्षणों पर डॉक्टर से मिलें।"
      : "Informational environmental guidance only — not medical diagnosis or treatment advice.",
  };
}

export function buildDeterministicDailyPlanFallback(
  ctx: GeminiAirQualityContext,
  locale: Locale
): AiDailyPlanResponse {
  const high = ctx.deterministicGuidance.healthProtectionPriority;
  const isHi = locale === "hi";
  const basis = `${ctx.location.name} · ${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`;

  return {
    headline: ctx.deterministicGuidance.headline,
    healthProtectionPriority: high,
    dataBasis: basis,
    personalizationBasis: `${ctx.nonSensitiveProfileSummary.householdSize} household members · ${ctx.nonSensitiveProfileSummary.primaryCommute}`,
    slots: [
      {
        window: "early_morning",
        timeRange: "06:00 – 08:30",
        title: isHi ? "सुबह इनडोर शुरुआत" : "Indoors-First Morning Start",
        whatToDo: high
          ? "Keep windows closed during early inversion; stretch or exercise indoors."
          : "Check hourly haze before stepping out; prefer calm residential streets.",
        whenToDoIt: "06:00 – 08:30 local time",
        whyRecommended:
          "Cold early-morning inversion commonly traps surface particulates.",
        expectedBenefit: "Avoids peak morning particulate inhalation.",
        alternativeAction:
          "Wear a well-fitted N95/FFP2 respirator if early outdoor travel is unavoidable.",
        healthPriority: high,
        caution: "Lower morning chill does not mean clean air.",
        sourceIds: ["WHO_AQG_2021", "US_EPA_AQI"],
        whyThisRecommendation:
          "Rule-based inversion precaution grounded in local AQI severity.",
      },
      {
        window: "morning_commute",
        timeRange: "08:30 – 10:30",
        title: isHi ? "सुरक्षित आवागमन विकल्प" : "Protected Commute Strategy",
        whatToDo: high
          ? "Choose enclosed metro/AC bus or remote work instead of open-air cycling."
          : "Use metro, public bus, or carpooling to cut commute emissions.",
        whenToDoIt: "Morning commute hours",
        whyRecommended:
          "Health protection takes priority over open-road active transit during unhealthy AQI.",
        expectedBenefit: "Limits roadside tailpipe and brake-dust exposure.",
        alternativeAction: "Batch errands to minimize road dwell time.",
        healthPriority: high,
        caution: "Avoid idling at school or office drop-off zones.",
        sourceIds: ["US_EPA_AQI", "MOHFW_INDIA"],
        whyThisRecommendation:
          "Prioritizes enclosed transit when particulate risk is elevated.",
      },
      {
        window: "midday",
        timeRange: "12:00 – 15:00",
        title: isHi ? "दोपहर फैलाव जांच" : "Midday Dispersion Check",
        whatToDo:
          "Handle brief essential outdoor errands if dispersion improves; keep exertion light.",
        whenToDoIt: "12:00 – 15:00 local time",
        whyRecommended:
          "Solar warming often supports comparatively better mixing than dawn.",
        expectedBenefit: "Reduces overlap with stagnant inversion peaks.",
        alternativeAction:
          "If forecast remains unhealthy, keep activities indoors.",
        healthPriority: high,
        caution:
          "Relatively lower AQI never guarantees safe outdoor air.",
        sourceIds: ["OPEN_METEO_AQ", "US_EPA_AQI"],
        whyThisRecommendation:
          "Reflects modeled intraday dispersion trend without promising safety.",
      },
      {
        window: "afternoon",
        timeRange: "15:00 – 17:30",
        title: isHi ? "इनडोर वेंटिलेशन निर्णय" : "Targeted Indoor Refresh",
        whatToDo: high
          ? "Keep exterior doors sealed and rely on HEPA filtration if available."
          : "Cross-ventilate briefly for 15 minutes only if haze has visibly cleared.",
        whenToDoIt: "Mid-afternoon",
        whyRecommended:
          "Balances indoor CO2 buildup against outdoor particulate infiltration.",
        expectedBenefit: "Maintains cleaner indoor living spaces.",
        alternativeAction: "Damp-mop surfaces instead of dry sweeping.",
        healthPriority: high,
        caution: "Close windows promptly before evening cooling begins.",
        sourceIds: ["US_EPA_INDOOR"],
        whyThisRecommendation:
          "Follows US EPA indoor source-control and ventilation guidance.",
      },
      {
        window: "evening",
        timeRange: "17:30 – 20:30",
        title: isHi ? "कम-धुआं भोजन तैयारी" : "Low-Smoke Cooking & Evening Calm",
        whatToDo:
          "Run kitchen exhaust fans, cover pans, and keep children's play indoors.",
        whenToDoIt: "Evening meal prep",
        whyRecommended:
          "Evening cooking aerosols compound rapidly with cooling outdoor haze.",
        expectedBenefit: "Prevents indoor PM2.5 spikes in living rooms.",
        alternativeAction: "Prefer steaming or pressure cooking over high-heat frying.",
        healthPriority: true,
        caution: "Avoid indoor incense, dhoop, or scented candles.",
        sourceIds: ["US_EPA_INDOOR", "NCDC_INDIA"],
        whyThisRecommendation:
          "Addresses primary controllable indoor combustion sources.",
      },
      {
        window: "night",
        timeRange: "20:30 – 23:00",
        title: isHi ? "स्वच्छ शयनकक्ष क्षेत्र" : "Clean-Air Sleep Zone",
        whatToDo:
          "Keep bedroom doors closed, run HEPA purifier if available, and prepare masks/medicines for morning.",
        whenToDoIt: "Bedtime prep",
        whyRecommended:
          "Overnight cooling lowers mixing height and increases stagnant smoke intrusion.",
        expectedBenefit: "Supports cleaner overnight breathing recovery.",
        alternativeAction:
          "Use simple draft stoppers under exterior doors on a zero/low budget.",
        healthPriority: true,
        caution: "Seek medical care promptly for nocturnal wheezing or chest tightness.",
        sourceIds: ["MOHFW_INDIA", "US_EPA_INDOOR"],
        whyThisRecommendation:
          "Protects sleeping hours for children, seniors, and sensitive members.",
      },
    ],
    sourceIds: ["WHO_AQG_2021", "US_EPA_AQI", "US_EPA_INDOOR", "MOHFW_INDIA"],
    disclaimer:
      "Deterministic rule-based schedule (not Gemini AI) — not medical advice.",
  };
}

export function buildDeterministicIndoorFallback(
  ctx: GeminiAirQualityContext
): AiIndoorAirResponse {
  return {
    headline: `Deterministic Indoor Air Baseline (${ctx.location.name})`,
    ventilationSummary: ctx.deterministicGuidance.healthProtectionPriority
      ? "Keep windows closed during unhealthy ambient hours and do not assume late-night/early-morning air is cleaner. Use kitchen exhaust only while cooking (exhaust fans pull outdoor polluted air inside when left on) and rely on source control/HEPA."
      : "Brief daytime cross-ventilation (not overnight) may help refresh indoor air only when modeled and visible outdoor haze is lower.",
    dataBasis: `${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`,
    cards: [
      {
        id: "det-in-kitchen",
        room: "kitchen",
        sourceCategory: "cooking_smoke",
        title: "Vent cooking smoke during active stove use",
        suggestedAction:
          "Run kitchen range exhaust/chimney while cooking with lids on pans, then switch it off afterward.",
        whyItMatters:
          "Cooking rapidly spikes indoor PM2.5 and NO2 inside closed homes.",
        ventilationGuidance:
          "An ordinary exhaust fan does not guarantee cleaner indoor air if outdoor smog is high, because negative pressure draws outdoor air through leaks—restrict use to active cooking.",
        relativeCost: "free",
        effortLevel: "low",
        caution: "Indoor levels are unmeasured by regional forecasts without a local sensor.",
        sourceIds: ["US_EPA_INDOOR"],
        whyThisRecommendation: "Evidence-based US EPA indoor source control.",
      },
      {
        id: "det-in-living",
        room: "living_room",
        sourceCategory: "indoor_combustion",
        title: "Eliminate indoor incense, dhoop, and candle smoke",
        suggestedAction:
          "Pause indoor burning rituals or switch to smoke-free alternatives during smog alerts.",
        whyItMatters:
          "Combustion indoors releases concentrated particulates into unventilated spaces.",
        ventilationGuidance: "Keep living area sealed from highway dust.",
        relativeCost: "free",
        effortLevel: "low",
        caution: "Houseplants alone cannot clean PM2.5 from indoor air.",
        sourceIds: ["US_EPA_INDOOR", "NCDC_INDIA"],
        whyThisRecommendation: "Prevents avoidable indoor particulate spikes.",
      },
      {
        id: "det-in-bedroom",
        room: "bedroom",
        sourceCategory: "filtration",
        title: "Seal gaps & run mechanical HEPA filtration if owned",
        suggestedAction:
          "Use inexpensive door draft stoppers and run true-HEPA filtration in bedrooms overnight.",
        whyItMatters:
          "Reduces infiltration of outdoor winter smog while sleeping.",
        ventilationGuidance: "Keep bedroom door shut when running purifier.",
        relativeCost: ctx.nonSensitiveProfileSummary.hasHepaPurifier
          ? "free"
          : "low_cost",
        effortLevel: "low",
        caution: "Never use ozone-generating air purifiers indoors.",
        sourceIds: ["US_EPA_INDOOR"],
        whyThisRecommendation: "Aligned with US EPA indoor air cleaner guidance.",
      },
    ],
    avoidList: [
      "Avoid ozone-generating air cleaners indoors.",
      "Do not rely on houseplants as a substitute for mechanical filtration.",
      "Avoid dry sweeping that resuspends settled dust.",
    ],
    sourceIds: ["US_EPA_INDOOR", "NCDC_INDIA"],
    disclaimer:
      "Deterministic rule-based indoor baseline (not Gemini AI).",
  };
}

export function buildDeterministicSustainabilityFallback(
  ctx: GeminiAirQualityContext
): AiSustainabilityResponse {
  const high = ctx.deterministicGuidance.healthProtectionPriority;
  return {
    headline: `Deterministic Sustainable Alternatives (${ctx.location.name})`,
    healthPriorityNote: high
      ? "Because ambient air is unhealthy, enclosed low-emission transit and remote work take priority over open-air walking/cycling."
      : "Public transit and household energy swaps help cut emissions while keeping personal exposure low.",
    dataBasis: `${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`,
    alternatives: [
      {
        id: "det-sus-1",
        domain: "daily_commute",
        currentActivity: `Primary commute (${ctx.nonSensitiveProfileSummary.primaryCommute})`,
        suggestedAlternative: high
          ? "Shift solo car/two-wheeler trips to enclosed metro rail, AC bus, or hybrid remote work."
          : "Combine metro rail, public bus, or carpooling for daily commutes.",
        feasibility: "high",
        relativeCost: "low_cost",
        qualitativeEnvironmentalBenefit:
          "Reduces per-passenger tailpipe exhaust and congestion (open the Impact Calculator for deterministic CO2e math).",
        healthAndPracticalTradeOff: high
          ? "Protects lungs better than open-road cycling during severe smog."
          : "Saves fuel costs; schedule around transit frequency.",
        sourceIds: ["US_EPA_AQI", "WHO_AQG_2021"],
        whyThisRecommendation: "Balances emissions with acute respiratory protection.",
      },
      {
        id: "det-sus-2",
        domain: "household_energy",
        currentActivity: "Daily household cooking & appliance usage",
        suggestedAlternative:
          "Use pressure cookers/lids, induction where available, and batch errands into single trips.",
        feasibility: "high",
        relativeCost: "free",
        qualitativeEnvironmentalBenefit:
          "Lowers household energy demand and indoor combustion byproducts.",
        healthAndPracticalTradeOff:
          "Reduces indoor NO2 and cooking smoke simultaneously.",
        sourceIds: ["US_EPA_INDOOR"],
        whyThisRecommendation: "Zero-cost dual benefit for indoor air and energy.",
      },
      {
        id: "det-sus-3",
        domain: "waste_practices",
        currentActivity: "Garden or household dry waste disposal",
        suggestedAlternative:
          "Compost dry leaves and strictly avoid open waste or biomass burning.",
        feasibility: "medium",
        relativeCost: "free",
        qualitativeEnvironmentalBenefit:
          "Prevents severe hyperlocal smoke plumes in residential neighborhoods.",
        healthAndPracticalTradeOff:
          "Requires society/municipal coordination for shared compost bins.",
        sourceIds: ["NCDC_INDIA"],
        whyThisRecommendation: "Directly targets local open-burning smog sources.",
      },
    ],
    sourceIds: ["WHO_AQG_2021", "US_EPA_INDOOR", "NCDC_INDIA"],
    disclaimer:
      "Deterministic rule-based alternatives (not Gemini AI). Use the Impact Calculator (/impact) for deterministic CO2e math.",
  };
}

export function buildDeterministicCommunityFallback(
  ctx: GeminiAirQualityContext,
  communityType: string
): AiCommunityPlanResponse {
  return {
    headline: `Deterministic ${communityType.replace("_", " ")} Smog Action Baseline (${ctx.location.name})`,
    dataBasis: `${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`,
    immediateActions: [
      "Enforce zero burning of dry leaves, trash, or bonfires on premises.",
      "Provide well-fitting N95/FFP2 masks and indoor rest rotations for outdoor security/maintenance staff.",
    ],
    weeklyActions: [
      "Set up carpool / bus-pool coordination boards for commuters and families.",
      "Audit dust suppression covers around any local repair or construction work.",
    ],
    longTermActions: [
      "Maintain compost pits for garden waste and upgrade shared indoor rooms with MERV-13/HEPA filtration.",
      "Create an annual winter smog readiness protocol aligned with local health advisories.",
    ],
    responsibilityCategories: [
      "Facilities & Maintenance Lead",
      "Health & Safety Coordinator",
      "Commute & Logistics Volunteers",
    ],
    expectedQualitativeOutcomes: [
      "Eliminates avoidable on-site smoke sources such as leaf burning.",
      "Reduces peak smog exposure for vulnerable community members and outdoor staff.",
    ],
    implementationChecklist: [
      "Circulate bilingual (EN/HI) smog-alert notice to residents or staff.",
      "Designate an enclosed clean-air room during severe AQI episodes.",
      "Stock verified N95/FFP2 masks for essential outdoor workers.",
    ],
    healthAndSafetyNotes: [
      "Move group sports and outdoor assemblies indoors when US AQI >= 151.",
      "Advise anyone experiencing breathing distress to seek prompt medical attention.",
    ],
    whyThisRecommendation:
      "Deterministic community safety baseline (Gemini AI not active).",
    sourceIds: ["NCDC_INDIA", "MOHFW_INDIA", "US_EPA_AQI"],
    disclaimer:
      "Deterministic rule-based community checklist (not Gemini AI).",
  };
}

export function buildDeterministicImpactFallback(
  ctx: GeminiAirQualityContext,
  comparison: TransportComparisonResult,
  locale: Locale
): AiImpactExplainResponse {
  const isHi = locale === "hi";
  const aqiText =
    ctx.current.usAqi !== null ? `${Math.round(ctx.current.usAqi)} US AQI` : "unavailable";

  return {
    headline: isHi
      ? `नियतात्मक प्रभाव सारांश: ${comparison.baseline.factor.labelHi} बनाम ${comparison.alternative.factor.labelHi}`
      : `Deterministic Impact Summary: ${comparison.baseline.factor.labelEn} vs ${comparison.alternative.factor.labelEn}`,
    whatItMeans: isHi
      ? `नियम-आधारित व्याख्या (Gemini AI नहीं): ${comparison.baseline.annualKgCo2e.toFixed(1)} kg CO2e/वर्ष की तुलना में वैकल्पिक मोड ${comparison.alternative.annualKgCo2e.toFixed(1)} kg CO2e/वर्ष उत्पन्न करता है (वार्षिक अंतर: ${comparison.avoidedAnnualKgCo2e.toFixed(1)} kg CO2e)।`
      : `Deterministic Rule-Based Explanation (Not Gemini AI): Your baseline mode (${comparison.baseline.factor.labelEn}) totals ${comparison.baseline.annualKgCo2e.toFixed(1)} kg CO2e/yr compared to ${comparison.alternative.annualKgCo2e.toFixed(1)} kg CO2e/yr for ${comparison.alternative.factor.labelEn}, a net annual difference of ${comparison.avoidedAnnualKgCo2e.toFixed(1)} kg CO2e (${comparison.percentageNote}).`,
    practicalTradeOffs: isHi
      ? comparison.boundaryNotice.summaryHi
      : comparison.boundaryNotice.summaryEn,
    exposureVsClimateNote: isHi
      ? `${ctx.location.name} का वर्तमान स्तर ${aqiText} है। कार्बन उत्सर्जन बचत स्थानीय PM2.5 श्वसन जोखिम से अलग है; उच्च प्रदूषण में खुली हवा में यात्रा से बचें।`
      : `Current ${ctx.location.name} reading is ${aqiText}. Transport CO2e savings are separate from inhaled PM2.5 exposure; during high AQI, prefer enclosed metro/AC transit or remote work over open-road cycling/walking.`,
    nextSteps: isHi
      ? [
          "यदि कोई बदलाव लागू किया गया है तो नीचे एक्टिविटी ट्रैकर में वास्तविक यात्रा लॉग करें।",
          "सर्दियों के स्मॉग में बाहर निकलने से पहले प्रति घंटा PM2.5 विंडो की जांच करें।",
        ]
      : [
          "Log completed trips in the Green Activity Progress Tracker to record achieved (not hypothetical) savings.",
          "Check hourly ambient PM2.5 before choosing open-air commutes on hazy winter mornings.",
        ],
    whyThisRecommendation: isHi
      ? "यह व्याख्या सीधे नियतात्मक उत्सर्जन कारक रजिस्ट्री (CEA / India GHG Program / UK DESNZ) और Open-Meteo डेटा पर आधारित है।"
      : "Grounded strictly in the deterministic emission factor registry (CEA / India GHG Program / UK DESNZ) and Open-Meteo server context.",
    dataBasis: `${comparison.registryVersion} · ${ctx.provenance.sourceName} (${ctx.provenance.dataSourceType})`,
    sourceIds: ["CEA_INDIA_CO2_V20", "INDIA_GHG_TRANSPORT", "UK_DESNZ_GHG_2024", "WHO_AQG_2021"],
    disclaimer: isHi
      ? "केवल नियतात्मक परिचालन CO2e अनुमान — मापी गई AQI या स्वास्थ्य जोखिम में कमी नहीं।"
      : "Deterministic operational CO2e estimate only — not a measured AQI or clinical health-risk reduction.",
  };
}
