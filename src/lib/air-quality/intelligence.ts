import { getUsAqiBand, type AqiBandToken } from "@/lib/constants/tokens";
import type {
  AirQualityForecast,
  AirQualityPoint,
  FamilyProfile,
  FreshnessStatus,
  Locale,
  PollutantKey,
  UsAqiSubindices,
} from "@/types/domain";

export const POLLUTANT_DISPLAY_META: Record<
  PollutantKey,
  {
    symbol: string;
    nameEn: string;
    nameHi: string;
    defaultUnit: string;
    descriptionEn: string;
    descriptionHi: string;
  }
> = {
  pm25: {
    symbol: "PM₂.₅",
    nameEn: "Fine Particulate Matter",
    nameHi: "सूक्ष्म कण (PM₂.₅)",
    defaultUnit: "µg/m³",
    descriptionEn:
      "Inhalable particles ≤2.5 µm that reach deep lung tissue and infiltrate indoors during winter smog.",
    descriptionHi:
      "2.5 माइक्रोन से छोटे कण जो फेफड़ों की गहराई और घर के भीतर प्रवेश कर सकते हैं।",
  },
  pm10: {
    symbol: "PM₁₀",
    nameEn: "Coarse Particulate Matter",
    nameHi: "स्थूल कण (PM₁₀)",
    defaultUnit: "µg/m³",
    descriptionEn:
      "Suspended dust, road wear, and smoke particulates ≤10 µm that irritate upper airways.",
    descriptionHi:
      "सड़क की धूल, निर्माण धूल और धुएं के 10 माइक्रोन से छोटे कण।",
  },
  no2: {
    symbol: "NO₂",
    nameEn: "Nitrogen Dioxide",
    nameHi: "नाइट्रोजन डाइऑक्साइड",
    defaultUnit: "µg/m³",
    descriptionEn:
      "Combustion gas elevated near dense traffic corridors and unvented gas appliances.",
    descriptionHi:
      "वाहनों के धुएं और बिना वेंट वाले गैस चूल्हों से निकलने वाली गैस।",
  },
  o3: {
    symbol: "O₃",
    nameEn: "Ground-Level Ozone",
    nameHi: "ओज़ोन (O₃)",
    defaultUnit: "µg/m³",
    descriptionEn:
      "Photochemical oxidant formed when sunlight reacts with traffic and industrial emissions.",
    descriptionHi:
      "सूर्य के प्रकाश और ट्रैफ़िक उत्सर्जन की प्रतिक्रिया से बनने वाली गैस।",
  },
  so2: {
    symbol: "SO₂",
    nameEn: "Sulfur Dioxide",
    nameHi: "सल्फर डाइऑक्साइड",
    defaultUnit: "µg/m³",
    descriptionEn:
      "Acidic combustion gas from coal, diesel, and industrial sources.",
    descriptionHi:
      "कोयला, डीज़ल और औद्योगिक दहन से निकलने वाली गैस।",
  },
  co: {
    symbol: "CO",
    nameEn: "Carbon Monoxide",
    nameHi: "कार्बन मोनोऑक्साइड",
    defaultUnit: "µg/m³",
    descriptionEn:
      "Colorless incomplete-combustion gas reported by Open-Meteo in µg/m³.",
    descriptionHi:
      "अपूर्ण दहन से निकलने वाली रंगहीन गैस (Open-Meteo द्वारा µg/m³ में रिपोर्ट)।",
  },
};

export interface AqiClassificationResult {
  valid: boolean;
  actualValue: number | null;
  roundedValue: number | null;
  isBeyondScale: boolean;
  gaugePercent: number;
  band: AqiBandToken | null;
}

export function classifyUsAqi(value: number | null | undefined): AqiClassificationResult {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return {
      valid: false,
      actualValue: null,
      roundedValue: null,
      isBeyondScale: false,
      gaugePercent: 0,
      band: null,
    };
  }

  const roundedValue = Math.round(value);
  return {
    valid: true,
    actualValue: value,
    roundedValue,
    isBeyondScale: value > 500,
    gaugePercent: Math.min(100, Math.max(0, (value / 500) * 100)),
    band: getUsAqiBand(value),
  };
}

export interface DominantPollutantResult {
  dominantPollutant: PollutantKey | null;
  subindexValue: number | null;
  reliable: boolean;
  reasonEn: string;
  reasonHi: string;
}

/**
 * Determines dominant pollutant strictly by comparing US AQI subindices,
 * never by comparing raw µg/m³ concentrations of different pollutants.
 */
export function determineDominantPollutant(
  subindices?: UsAqiSubindices | null
): DominantPollutantResult {
  if (!subindices) {
    return {
      dominantPollutant: null,
      subindexValue: null,
      reliable: false,
      reasonEn:
        "Pollutant-specific AQI subindices are unavailable; dominant pollutant cannot be determined reliably.",
      reasonHi:
        "प्रदूषक-विशिष्ट AQI उप-सूचकांक उपलब्ध नहीं हैं; प्रमुख प्रदूषक का विश्वसनीय निर्धारण संभव नहीं है।",
    };
  }

  const entries = (Object.entries(subindices) as [PollutantKey, number | null][])
    .filter(([, v]) => v !== null && Number.isFinite(v) && v >= 0)
    .map(([k, v]) => [k, v as number] as const);

  if (entries.length < 2) {
    return {
      dominantPollutant: null,
      subindexValue: null,
      reliable: false,
      reasonEn:
        "Insufficient pollutant subindices to determine dominant pollutant reliably.",
      reasonHi:
        "प्रमुख प्रदूषक को विश्वसनीय रूप से निर्धारित करने के लिए पर्याप्त उप-सूचकांक उपलब्ध नहीं हैं।",
    };
  }

  let bestKey: PollutantKey = entries[0][0];
  let bestVal = entries[0][1];
  for (const [key, val] of entries) {
    if (val > bestVal) {
      bestKey = key;
      bestVal = val;
    }
  }

  return {
    dominantPollutant: bestKey,
    subindexValue: Math.round(bestVal),
    reliable: true,
    reasonEn: `${POLLUTANT_DISPLAY_META[bestKey].symbol} carries the highest US AQI subindex (${Math.round(bestVal)}).`,
    reasonHi: `${POLLUTANT_DISPLAY_META[bestKey].symbol} का US AQI उप-सूचकांक सबसे अधिक (${Math.round(bestVal)}) है।`,
  };
}

export function formatPollutantValue(
  key: PollutantKey,
  value: number | null | undefined,
  unit?: string
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }
  const resolvedUnit = unit || POLLUTANT_DISPLAY_META[key].defaultUnit;
  const formatted = key === "co" ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted} ${resolvedUnit}`;
}

export interface FreshnessEvaluation {
  status: FreshnessStatus;
  ageMinutes: number;
  isStale: boolean;
}

export function evaluateDataFreshness(
  fetchedAtIso: string,
  nowMs: number = Date.now(),
  freshTtlMs: number = 15 * 60 * 1000
): FreshnessEvaluation {
  const fetchedMs = Date.parse(fetchedAtIso);
  if (!Number.isFinite(fetchedMs)) {
    return { status: "unavailable", ageMinutes: 0, isStale: true };
  }
  const diffMs = Math.max(0, nowMs - fetchedMs);
  const ageMinutes = Math.round(diffMs / 60_000);
  if (diffMs <= freshTtlMs) {
    return { status: "fresh", ageMinutes, isStale: false };
  }
  return { status: "stale", ageMinutes, isStale: true };
}

export interface ForecastSummary {
  horizonHours: 24 | 48;
  availableHours: number;
  unhealthyOrWorseHours: number;
  allUnhealthyOrWorse: boolean;
  lowestPoint: { timestampIso: string; usAqi: number } | null;
  highestPoint: { timestampIso: string; usAqi: number } | null;
  trend: "rising" | "falling" | "steady" | "insufficient_data";
}

export function summarizeForecast(
  hourly: AirQualityPoint[],
  horizonHours: 24 | 48 = 24
): ForecastSummary {
  const slice = hourly.slice(0, horizonHours);
  const validPoints = slice.filter(
    (pt): pt is AirQualityPoint & { usAqi: number } =>
      pt.usAqi !== null && Number.isFinite(pt.usAqi)
  );

  if (validPoints.length === 0) {
    return {
      horizonHours,
      availableHours: 0,
      unhealthyOrWorseHours: 0,
      allUnhealthyOrWorse: false,
      lowestPoint: null,
      highestPoint: null,
      trend: "insufficient_data",
    };
  }

  let lowest = validPoints[0];
  let highest = validPoints[0];
  let unhealthyOrWorseHours = 0;

  for (const pt of validPoints) {
    if (pt.usAqi < lowest.usAqi) lowest = pt;
    if (pt.usAqi > highest.usAqi) highest = pt;
    if (pt.usAqi >= 151) unhealthyOrWorseHours += 1;
  }

  let trend: ForecastSummary["trend"] = "insufficient_data";
  if (validPoints.length >= 4) {
    const half = Math.floor(validPoints.length / 2);
    const firstAvg =
      validPoints.slice(0, half).reduce((s, p) => s + p.usAqi, 0) / half;
    const secondAvg =
      validPoints.slice(half).reduce((s, p) => s + p.usAqi, 0) /
      (validPoints.length - half);
    const delta = secondAvg - firstAvg;
    if (delta >= 12) trend = "rising";
    else if (delta <= -12) trend = "falling";
    else trend = "steady";
  }

  return {
    horizonHours,
    availableHours: validPoints.length,
    unhealthyOrWorseHours,
    allUnhealthyOrWorse: unhealthyOrWorseHours === validPoints.length,
    lowestPoint: {
      timestampIso: lowest.timestampIso,
      usAqi: Math.round(lowest.usAqi),
    },
    highestPoint: {
      timestampIso: highest.timestampIso,
      usAqi: Math.round(highest.usAqi),
    },
    trend,
  };
}

export interface ExposureWindowCandidate {
  startIso: string;
  endIso: string;
  averageUsAqi: number;
  windowHours: 1 | 2;
}

export interface LowerExposureWindowResult {
  available: boolean;
  windowHours: 1 | 2;
  bestWindow: ExposureWindowCandidate | null;
  practicalWindow: ExposureWindowCandidate | null;
  practicalWindowNoteEn: string;
  practicalWindowNoteHi: string;
  peakWindow: ExposureWindowCandidate | null;
  postponeOutdoorExercise: boolean;
  cautionEn: string;
  cautionHi: string;
  limitationNoteEn: string;
  limitationNoteHi: string;
}

function getLocalHourAndDateKey(
  iso: string,
  timezone: string
): { hour: number; dateKey: string; shortDate: string } | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      timeZone: timezone || "UTC",
    }).formatToParts(parsed);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const hourNum = Number(get("hour")) % 24;
    const shortDate = parsed.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      timeZone: timezone || "UTC",
    });
    return {
      hour: Number.isFinite(hourNum) ? hourNum : parsed.getUTCHours(),
      dateKey: `${get("year")}-${get("month")}-${get("day")}`,
      shortDate,
    };
  } catch {
    return {
      hour: parsed.getUTCHours(),
      dateKey: iso.slice(0, 10),
      shortDate: iso.slice(5, 10),
    };
  }
}

function getPracticalHourBounds(profile?: FamilyProfile): {
  minStartHour: number;
  maxStartHour: number;
} {
  // Never recommend sleeping/midnight hours (21:00–06:30) for routine errands
  if (profile?.outdoorPreference === "mostly_indoors") {
    return { minStartHour: 10, maxStartHour: 17 };
  }
  if (profile?.workScheduleMode === "onsite" && profile?.outdoorPreference === "evening_exercise") {
    return { minStartHour: 7, maxStartHour: 19 };
  }
  return { minStartHour: 7, maxStartHour: 19 };
}

/**
 * Finds the relatively lower-pollution contiguous 1h or 2h window from valid consecutive forecast points,
 * and separately computes a practical active-daytime window avoiding sleeping/midnight hours.
 */
export function findRelativelyLowerExposureWindows(
  hourly: AirQualityPoint[],
  windowHours: 1 | 2 = 2,
  horizonHours: 24 | 48 = 24,
  options?: { timezone?: string; profile?: FamilyProfile }
): LowerExposureWindowResult {
  const slice = hourly.slice(0, horizonHours);
  const candidates: ExposureWindowCandidate[] = [];
  const tz = options?.timezone || "UTC";

  for (let i = 0; i <= slice.length - windowHours; i++) {
    const group = slice.slice(i, i + windowHours);
    if (
      group.some(
        (pt) => pt.usAqi === null || !Number.isFinite(pt.usAqi)
      )
    ) {
      continue;
    }

    // Verify 1-hour contiguity when windowHours === 2
    if (windowHours === 2) {
      const t0 = Date.parse(group[0].timestampIso);
      const t1 = Date.parse(group[1].timestampIso);
      if (!Number.isFinite(t0) || !Number.isFinite(t1) || Math.abs(t1 - t0 - 3_600_000) > 60_000) {
        continue;
      }
    }

    const avg =
      group.reduce((sum, pt) => sum + (pt.usAqi as number), 0) / windowHours;
    const endMs = Date.parse(group[group.length - 1].timestampIso) + 3_600_000;

    candidates.push({
      startIso: group[0].timestampIso,
      endIso: new Date(endMs).toISOString(),
      averageUsAqi: Math.round(avg),
      windowHours,
    });
  }

  if (candidates.length === 0) {
    return {
      available: false,
      windowHours,
      bestWindow: null,
      practicalWindow: null,
      practicalWindowNoteEn:
        "No valid forecast window available; postpone non-essential outdoor trips or rely on indoor alternatives.",
      practicalWindowNoteHi:
        "कोई वैध पूर्वानुमान अवधि उपलब्ध नहीं है; गैर-जरूरी बाहरी काम टालें या इनडोर विकल्प चुनें।",
      peakWindow: null,
      postponeOutdoorExercise: true,
      cautionEn:
        "Insufficient consecutive hourly forecast points to identify a relatively lower-pollution window.",
      cautionHi:
        "अपेक्षाकृत कम-प्रदूषण अवधि पहचानने के लिए पर्याप्त क्रमिक प्रति घंटा डेटा उपलब्ध नहीं है।",
      limitationNoteEn:
        "Gaps in modeled hourly series are never interpolated.",
      limitationNoteHi:
        "मॉडल्ड प्रति घंटा डेटा के अंतराल को काल्पनिक मानों से नहीं भरा जाता।",
    };
  }

  let best = candidates[0];
  let peak = candidates[0];
  for (const c of candidates) {
    if (c.averageUsAqi < best.averageUsAqi) best = c;
    if (c.averageUsAqi > peak.averageUsAqi) peak = c;
  }

  const { minStartHour, maxStartHour } = getPracticalHourBounds(options?.profile);
  const daytimeCandidates = candidates.filter((c) => {
    const startMeta = getLocalHourAndDateInTzSafe(c.startIso, tz);
    if (!startMeta) return false;
    return startMeta.hour >= minStartHour && startMeta.hour <= maxStartHour;
  });

  const lowestDaytime =
    daytimeCandidates.length > 0
      ? daytimeCandidates.reduce((a, b) =>
          b.averageUsAqi < a.averageUsAqi ? b : a
        )
      : null;

  const practicalWindow =
    lowestDaytime && lowestDaytime.averageUsAqi < 151 ? lowestDaytime : null;

  const postponeOutdoorExercise = best.averageUsAqi >= 101;
  const allUnhealthy = best.averageUsAqi >= 151;

  let practicalWindowNoteEn: string;
  let practicalWindowNoteHi: string;

  if (practicalWindow) {
    const formatted = formatWindowRangeInTz(
      practicalWindow.startIso,
      practicalWindow.endIso,
      tz
    );
    practicalWindowNoteEn =
      practicalWindow.averageUsAqi >= 101
        ? `Practical daytime errand window: ${formatted} (avg US AQI ${practicalWindow.averageUsAqi}; keep exertion light and sensitive groups cautious).`
        : `Practical active window: ${formatted} (avg US AQI ${practicalWindow.averageUsAqi}). Avoid heavy traffic corridors.`;
    practicalWindowNoteHi =
      practicalWindow.averageUsAqi >= 101
        ? `व्यावहारिक दिन की अवधि: ${formatted} (औसत US AQI ${practicalWindow.averageUsAqi}; श्रम हल्का रखें और संवेदनशील सदस्य सतर्क रहें)।`
        : `व्यावहारिक सक्रिय अवधि: ${formatted} (औसत US AQI ${practicalWindow.averageUsAqi})। व्यस्त सड़कों से बचें।`;
  } else {
    practicalWindowNoteEn =
      "No suitable low-AQI daytime window exists (active hours 07:00–20:00 stay Unhealthy); postpone non-essential errands or shift indoors rather than heading out during overnight forecast dips.";
    practicalWindowNoteHi =
      "दिन के व्यावहारिक घंटों (07:00–20:00) में कोई सुरक्षित कम-प्रदूषण अवधि नहीं है; देर रात की गिरावट पर बाहर जाने के बजाय गैर-जरूरी काम टालें या इनडोर विकल्प अपनाएं।";
  }

  return {
    available: true,
    windowHours,
    bestWindow: best,
    practicalWindow,
    practicalWindowNoteEn,
    practicalWindowNoteHi,
    peakWindow: peak,
    postponeOutdoorExercise,
    cautionEn: allUnhealthy
      ? "Forecast remains Unhealthy or worse across all windows. Postpone strenuous outdoor exercise and choose indoor alternatives."
      : postponeOutdoorExercise
        ? "Even the relatively lower period remains elevated for sensitive groups. Keep outdoor exertion light and brief; lower AQI does not guarantee safe air."
        : "This period shows relatively lower modeled AQI compared with peak hours, though hyperlocal street-level traffic emissions can still vary.",
    cautionHi: allUnhealthy
      ? "पूरे पूर्वानुमान में वायु गुणवत्ता अस्वस्थ या अधिक खराब बनी हुई है। भारी बाहरी व्यायाम टालें और इनडोर विकल्प चुनें।"
      : postponeOutdoorExercise
        ? "अपेक्षाकृत कम अवधि में भी संवेदनशील समूहों के लिए स्तर ऊंचा है। बाहरी श्रम हल्का रखें; कम AQI पूर्ण सुरक्षा की गारंटी नहीं है।"
        : "यह अवधि पीक घंटों की तुलना में अपेक्षाकृत कम मॉडल्ड AQI दिखाती है, लेकिन स्थानीय सड़क प्रदूषण भिन्न हो सकता है।",
    limitationNoteEn:
      "Based on modeled regional CAMS/Open-Meteo hourly US AQI averages; street-level conditions near traffic or burning may be higher.",
    limitationNoteHi:
      "मॉडल्ड क्षेत्रीय CAMS/Open-Meteo प्रति घंटा औसत पर आधारित; ट्रैफ़िक या धुएं के पास स्थानीय स्तर अधिक हो सकता है।",
  };
}

function getLocalHourAndDateInTzSafe(iso: string, timezone: string) {
  return getLocalHourAndDateKey(iso, timezone);
}

export type GuidanceCategory =
  | "outdoor_exercise"
  | "children"
  | "essential_travel"
  | "commuting"
  | "indoor_smoke"
  | "ventilation_timing"
  | "sensitive_groups";

export interface RuleBasedGuidanceItem {
  id: string;
  category: GuidanceCategory;
  title: string;
  action: string;
  rationale: string;
  priority: "protective" | "advisory";
}

export interface RuleBasedActionBundle {
  sourceType: "rule_based";
  isAiGenerated: false;
  healthProtectionPriority: boolean;
  headline: string;
  whyItMatters: string;
  expectedQualitativeBenefit: string;
  recommendedPrimaryAction: string;
  items: RuleBasedGuidanceItem[];
  references: readonly { label: string; url: string }[];
  medicalDisclaimer: string;
}

export const PUBLIC_HEALTH_REFERENCES = [
  {
    label: "WHO Global Air Quality Guidelines",
    url: "https://www.who.int/publications/i/item/9789240034228",
  },
  {
    label: "US EPA AQI Guide for Air Quality & Health",
    url: "https://www.airnow.gov/aqi/aqi-basics/",
  },
  {
    label: "India MoHFW / NCDC Air Pollution Health Advisory",
    url: "https://ncdc.mohfw.gov.in/",
  },
] as const;

function buildGuidanceItemsEn(
  healthPriority: boolean,
  windowPhrase: string | null
): RuleBasedGuidanceItem[] {
  const priority = healthPriority ? "protective" : "advisory";
  return [
    {
      id: "g-exercise",
      category: "outdoor_exercise",
      title: "Outdoor Exercise",
      action: healthPriority
        ? "Postpone outdoor running or intense cycling; switch to indoor mobility, yoga, or home workouts."
        : "Moderate outdoor activity is reasonable away from heavy traffic corridors.",
      rationale: "Higher breathing rates during exertion draw more fine particulates deeper into airways.",
      priority,
    },
    {
      id: "g-children",
      category: "children",
      title: "Children's Activities",
      action: healthPriority
        ? "Keep children's vigorous play indoors and check school smog advisories."
        : "Prefer midday shaded play spaces away from idling vehicle pickup zones.",
      rationale: "Developing lungs breathe more air per kilogram of body weight than adults.",
      priority,
    },
    {
      id: "g-travel",
      category: "essential_travel",
      title: "Essential Travel",
      action: healthPriority
        ? "Batch essential errands and wear a snug, well-fitting N95/FFP2 respirator outdoors."
        : "Combine trips during relatively lower-pollution midday hours where feasible.",
      rationale: "Reducing total outdoor dwell time lowers cumulative particulate inhalation.",
      priority,
    },
    {
      id: "g-commute",
      category: "commuting",
      title: "Commuting Choice",
      action: healthPriority
        ? "Prioritize enclosed metro/AC transit or remote work over open-air walking/cycling during severe smog."
        : "Choose metro, public bus, or carpooling to cut per-passenger emissions.",
      rationale: "Personal health protection overrides active open-air commuting when AQI is unhealthy.",
      priority,
    },
    {
      id: "g-indoor",
      category: "indoor_smoke",
      title: "Indoor Smoke Reduction",
      action:
        "Use kitchen range exhaust strictly while cooking to vent concentrated frying smoke/NO2, then turn it off (ordinary exhaust fans pull polluted outdoor air inside through leaks when ambient air is unhealthy). Damp-mop floors and avoid incense or candles.",
      rationale:
        "Cooking smoke spikes indoor particulates rapidly, while continuous exhaust fan draw worsens infiltration during severe smog.",
      priority: "protective",
    },
    {
      id: "g-ventilation",
      category: "ventilation_timing",
      title: "Ventilation Timing",
      action:
        healthPriority || !windowPhrase
          ? "Do not assume late-night or early-morning outdoor air is cleaner; keep exterior doors/windows sealed until ambient haze improves, and rely on source control or HEPA filtration."
          : `Cross-ventilate briefly (~10–15 min) during practical daytime hours (${windowPhrase}) when outdoor haze dips, avoiding rush-hour traffic peaks.`,
      rationale:
        "Overnight and early-morning temperature inversions frequently trap pollution near ground level, and regional models do not measure your room.",
      priority,
    },
    {
      id: "g-sensitive",
      category: "sensitive_groups",
      title: "Sensitive Populations",
      action:
        "Older adults and anyone with asthma/heart/lung conditions should limit outdoor exposure and keep prescribed rescue medications accessible.",
      rationale: "Sensitive groups face elevated risk of airway irritation and symptom flare-ups.",
      priority: "protective",
    },
  ];
}

function buildGuidanceItemsHi(
  healthPriority: boolean,
  windowPhrase: string | null
): RuleBasedGuidanceItem[] {
  const priority = healthPriority ? "protective" : "advisory";
  return [
    {
      id: "g-exercise",
      category: "outdoor_exercise",
      title: "बाहरी व्यायाम",
      action: healthPriority
        ? "बाहरी जॉगिंग, साइकिलिंग या भारी व्यायाम टालें; घर के भीतर स्ट्रेचिंग या योग करें।"
        : "हल्का बाहरी व्यायाम संभव है, लेकिन भारी ट्रैफ़िक सड़कों से दूर रहें।",
      rationale: "तेज व्यायाम से श्वसन दर बढ़ने पर प्रदूषक अधिक अंदर जाते हैं।",
      priority,
    },
    {
      id: "g-children",
      category: "children",
      title: "बच्चों की गतिविधियाँ",
      action: healthPriority
        ? "बच्चों का खेल समय घर के भीतर रखें; स्कूल आउटडोर ड्रिल कम करें।"
        : "बच्चों के बाहर खेलने से पहले स्थानीय धुंध की स्थिति जांचें।",
      rationale: "बच्चों के फेफड़े विकसित हो रहे होते हैं और वे अधिक हवा सांस में लेते हैं।",
      priority,
    },
    {
      id: "g-travel",
      category: "essential_travel",
      title: "आवश्यक यात्रा",
      action: healthPriority
        ? "आवश्यक बाहर जाने पर अच्छी तरह फिट होने वाला N95/FFP2 मास्क उपयोग करें।"
        : "अपेक्षाकृत कम-प्रदूषण समय में यात्रा को एक साथ समेटें।",
      rationale: "गैर-जरूरी समय में बाहरी संपर्क घटाने से कण भार कम होता है।",
      priority,
    },
    {
      id: "g-commute",
      category: "commuting",
      title: "दैनिक आवागमन",
      action: healthPriority
        ? "गंभीर प्रदूषण में खुली हवा की पैदल/साइकिल यात्रा के बजाय बंद मेट्रो, एसी बस या WFH चुनें।"
        : "उत्सर्जन घटाने के लिए मेट्रो, बस या कारपूल को प्राथमिकता दें।",
      rationale: "गंभीर स्मॉग में पर्यावरण-अनुकूल खुली यात्रा की तुलना में श्वसन सुरक्षा अधिक महत्वपूर्ण है।",
      priority,
    },
    {
      id: "g-indoor",
      category: "indoor_smoke",
      title: "इनडोर धुआं नियंत्रण",
      action:
        "खाना पकाते समय ही किचन एग्जॉस्ट चलाएं (पकाने के बाद बंद कर दें क्योंकि बाहरी स्मॉग में साधारण एग्जॉस्ट बाहर की हवा खींच सकता है); गीला पोंछा लगाएं और अगरबत्ती/धूप से बचें।",
      rationale:
        "बंद कमरों में इनडोर दहन PM₂.₅ को तेज़ी से बढ़ाता है, पर बाहरी स्मॉग में अनावश्यक एग्जॉस्ट से बचाव ज़रूरी है।",
      priority: "protective",
    },
    {
      id: "g-ventilation",
      category: "ventilation_timing",
      title: "वेंटिलेशन समय",
      action:
        healthPriority || !windowPhrase
          ? "देर रात या तड़के की बाहरी हवा को स्वच्छ मानकर खिड़कियां न खोलें; बाहरी सुधार दिखने तक दरवाजे-दरारें सील रखें और HEPA/स्रोत नियंत्रण अपनाएं।"
          : `केवल दिन के व्यावहारिक समय (${windowPhrase}) में 10–15 मिनट संक्षिप्त वेंटिलेशन करें; रात में खिड़कियां बंद रखें।`,
      rationale:
        "देर रात और सुबह तापमान व्युत्क्रमण अक्सर कणों को ज़मीन के पास रोक देता है; मॉडल्ड डेटा स्थानीय सड़क प्रदूषण नहीं मापता।",
      priority,
    },
    {
      id: "g-sensitive",
      category: "sensitive_groups",
      title: "संवेदनशील समूह",
      action:
        "वरिष्ठजनों और श्वसन संवेदनशील सदस्यों को धुंध में बाहर न जाने दें; डॉक्टर की निर्धारित दवाएं पास रखें।",
      rationale: "संवेदनशील समूहों में सूजन व सांस की तकलीफ का जोखिम अधिक होता है।",
      priority: "protective",
    },
  ];
}

export function buildRuleBasedGuidance(
  forecast: AirQualityForecast,
  profile: FamilyProfile,
  locale: Locale,
  lowerWindow?: LowerExposureWindowResult
): RuleBasedActionBundle {
  const aqi = forecast.current.usAqi;
  const sensitiveHousehold =
    profile.hasRespiratorySensitivity ||
    profile.childrenCount > 0 ||
    profile.seniorsCount > 0;
  const healthPriority =
    aqi !== null && (aqi >= 151 || (aqi >= 101 && sensitiveHousehold));

  // Use ONLY practical daytime active hours (never midnight/00:30 dips!) for recommended errands
  const windowPhrase = lowerWindow?.practicalWindow
    ? formatWindowRangeInTz(
        lowerWindow.practicalWindow.startIso,
        lowerWindow.practicalWindow.endIso,
        forecast.location.timezone
      )
    : null;

  if (locale === "hi") {
    const whyUnavailable = "वर्तमान AQI मान अनुपलब्ध है, इसलिए एहतियाती सामान्य मार्गदर्शन दिखाया जा रहा है।";
    const whyValue = healthPriority
      ? `वर्तमान मॉडल्ड US AQI (${Math.round(aqi ?? 0)}) ऊंचा है; तेज सांस लेने से सूक्ष्म कणों का संपर्क बढ़ता है।`
      : `वर्तमान मॉडल्ड US AQI (${Math.round(aqi ?? 0)}) अपेक्षाकृत कम श्रेणी में है, फिर भी ट्रैफ़िक व धुएं से बचें।`;
    const primaryBalanced = windowPhrase
      ? `अपेक्षाकृत कम अवधि (~${windowPhrase}) में आवश्यक काम निपटाएं और सार्वजनिक परिवहन चुनें।`
      : "व्यस्त सड़कों से दूर समय पर बाहरी काम करें और इनडोर धुआं न होने दें।";

    return {
      sourceType: "rule_based",
      isAiGenerated: false,
      healthProtectionPriority: healthPriority,
      headline: healthPriority
        ? "स्वास्थ्य सुरक्षा प्राथमिकता: बाहरी श्रम कम करें और इनडोर हवा सुरक्षित रखें"
        : "मॉडल्ड परिस्थितियां अपेक्षाकृत संतुलित हैं — दिनचर्या में सतर्कता रखें",
      whyItMatters: aqi === null ? whyUnavailable : whyValue,
      expectedQualitativeBenefit: healthPriority
        ? "सुबह/शाम के पीक स्मॉग के दौरान उच्च कण-प्रवेश और श्वसन तनाव को कम करने में मदद।"
        : "दैनिक स्वास्थ्य और कम-उत्सर्जन यात्रा विकल्पों के बीच सुरक्षित संतुलन।",
      recommendedPrimaryAction: healthPriority
        ? "बाहरी दौड़/साइकिलिंग को इनडोर विकल्प में बदलें और बाहर जाने पर अच्छी फिट वाला N95/FFP2 मास्क पहनें।"
        : primaryBalanced,
      items: buildGuidanceItemsHi(healthPriority, windowPhrase),
      references: PUBLIC_HEALTH_REFERENCES,
      medicalDisclaimer:
        "यह नियम-आधारित पर्यावरणीय मार्गदर्शन है, चिकित्सीय निदान नहीं। सीने में दर्द, सांस फूलने या गंभीर लक्षणों पर तुरंत चिकित्सकीय सहायता लें।",
    };
  }

  const whyUnavailable = "Current US AQI is unavailable, so conservative protective baseline guidance is shown.";
  const whyValue = healthPriority
    ? `Modeled US AQI is ${Math.round(aqi ?? 0)}, where elevated particulate inhalation outweighs outdoor eco-commute benefits.`
    : `Modeled US AQI is ${Math.round(aqi ?? 0)}, though street-level exhaust near busy roads can still exceed regional averages.`;
  const primaryBalanced = windowPhrase
    ? `Schedule essential outdoor errands near ~${windowPhrase} and choose metro/bus transit to lower emissions.`
    : "Prefer enclosed public transit or carpooling and keep indoor cooking/smoke ventilated.";

  return {
    sourceType: "rule_based",
    isAiGenerated: false,
    healthProtectionPriority: healthPriority,
    headline: healthPriority
      ? "Health Protection Priority: Shift strenuous activity indoors & limit exposure"
      : "Conditions allow cautious routine planning — minimize traffic-corridor exposure",
    whyItMatters: aqi === null ? whyUnavailable : whyValue,
    expectedQualitativeBenefit: healthPriority
      ? "Helps lower acute inhalation of fine particulates during stagnant morning/evening smog windows."
      : "Balances daily mobility needs with cleaner timing and indoor source control.",
    recommendedPrimaryAction: healthPriority
      ? "Move workouts indoors, use enclosed transit or WFH instead of open-road cycling, and wear a well-fitted N95/FFP2 mask for essential outdoor trips."
      : primaryBalanced,
    items: buildGuidanceItemsEn(healthPriority, windowPhrase),
    references: PUBLIC_HEALTH_REFERENCES,
    medicalDisclaimer:
      "Rule-based environmental guidance only — not medical advice or diagnosis. Seek prompt medical care if experiencing shortness of breath, chest pain, or worsening symptoms.",
  };
}

export interface AirQualityInsightCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "positive" | "caution";
}

function buildTrendInsight(
  summary: ForecastSummary,
  locale: Locale
): AirQualityInsightCard {
  const isHi = locale === "hi";
  const labels = isHi
    ? {
        rising: "बढ़ता रुझान",
        falling: "घटता रुझान",
        steady: "स्थिर रुझान",
        insufficient_data: "अपर्याप्त डेटा",
      }
    : {
        rising: "Rising trend",
        falling: "Easing trend",
        steady: "Steady levels",
        insufficient_data: "Insufficient data",
      };

  const detail =
    summary.lowestPoint && summary.highestPoint
      ? isHi
        ? `सीमा: ${summary.lowestPoint.usAqi} से ${summary.highestPoint.usAqi} US AQI (${summary.availableHours} घंटे)`
        : `Range ${summary.lowestPoint.usAqi}–${summary.highestPoint.usAqi} US AQI across ${summary.availableHours} valid hours.`
      : isHi
        ? "पर्याप्त प्रति घंटा डेटा उपलब्ध नहीं।"
        : "Insufficient hourly forecast points available.";

  return {
    id: "insight-trend",
    label: isHi ? "24-घंटे का रुझान" : "24h Pollution Trend",
    value: labels[summary.trend],
    detail,
    tone: summary.trend === "rising" ? "caution" : "neutral",
  };
}

function buildWindowInsight(
  lowerWindow: LowerExposureWindowResult,
  tz: string,
  locale: Locale
): AirQualityInsightCard {
  const isHi = locale === "hi";
  const pw = lowerWindow.practicalWindow;
  const practicalTime = pw ? formatWindowRangeInTz(pw.startIso, pw.endIso, tz) : null;
  const lowTime = lowerWindow.bestWindow
    ? formatWindowRangeInTz(
        lowerWindow.bestWindow.startIso,
        lowerWindow.bestWindow.endIso,
        tz
      )
    : isHi
      ? "अनिश्चित"
      : "Unavailable";

  const value =
    practicalTime && pw
      ? `${practicalTime} (~${pw.averageUsAqi} AQI)`
      : isHi
        ? "इनडोर प्राथमिकता / टालें"
        : "Indoors Recommended";

  const detail = lowerWindow.bestWindow
    ? isHi
      ? `मॉडल न्यूनतम अवधि: ${lowTime} (~${lowerWindow.bestWindow.averageUsAqi} AQI)। ${lowerWindow.practicalWindowNoteHi}`
      : `Forecast lowest: ${lowTime} (~${lowerWindow.bestWindow.averageUsAqi} AQI). ${lowerWindow.practicalWindowNoteEn}`
    : lowerWindow.cautionEn;

  return {
    id: "insight-window",
    label: isHi ? "पूर्वानुमान न्यूनतम व व्यावहारिक समय" : "Forecast Low vs Practical Window",
    value,
    detail,
    tone: pw && !lowerWindow.postponeOutdoorExercise ? "positive" : "caution",
  };
}

function buildFreshnessInsight(
  forecast: AirQualityForecast,
  locale: Locale
): AirQualityInsightCard {
  const isHi = locale === "hi";
  const srcType = forecast.provenance.dataSourceType;
  let value = isHi ? "लाइव मॉडल्ड" : "Live Modeled";
  if (srcType === "demonstration") {
    value = isHi ? "डेमो मोड" : "Demonstration";
  } else if (forecast.provenance.isStale) {
    value = isHi ? "पुराना कैश्ड डेटा" : "Stale Cache";
  } else if (srcType === "cached") {
    value = isHi ? "कैश्ड मॉडल्ड" : "Cached Modeled";
  }

  return {
    id: "insight-freshness",
    label: isHi ? "डेटा ताज़गी व स्रोत" : "Freshness & Reliability",
    value,
    detail: forecast.provenance.aqiStandardNote,
    tone: forecast.provenance.isStale ? "caution" : "neutral",
  };
}

export function buildAirQualityInsights(
  forecast: AirQualityForecast,
  summary: ForecastSummary,
  lowerWindow: LowerExposureWindowResult,
  guidance: RuleBasedActionBundle,
  dominant: DominantPollutantResult,
  locale: Locale
): AirQualityInsightCard[] {
  const isHi = locale === "hi";
  return [
    buildTrendInsight(summary, locale),
    buildWindowInsight(lowerWindow, forecast.location.timezone, locale),
    {
      id: "insight-dominant",
      label: isHi ? "प्रमुख प्रदूषक" : "Dominant Pollutant",
      value:
        dominant.reliable && dominant.dominantPollutant
          ? `${POLLUTANT_DISPLAY_META[dominant.dominantPollutant].symbol} (AQI ${dominant.subindexValue})`
          : isHi
            ? "निर्धारण संभव नहीं"
            : "Indeterminate",
      detail: isHi ? dominant.reasonHi : dominant.reasonEn,
      tone: "neutral",
    },
    {
      id: "insight-action",
      label: isHi ? "मुख्य गतिविधि समायोजन" : "Activity Adjustment",
      value: guidance.healthProtectionPriority
        ? isHi
          ? "इनडोर प्राथमिकता"
          : "Prioritize Indoors"
        : isHi
          ? "संतुलित सतर्कता"
          : "Cautious Routine",
      detail: guidance.recommendedPrimaryAction,
      tone: guidance.healthProtectionPriority ? "caution" : "positive",
    },
    buildFreshnessInsight(forecast, locale),
  ];
}

export function formatHourInTz(iso: string, timezone: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  try {
    return parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || "UTC",
    });
  } catch {
    return parsed.toISOString().slice(11, 16);
  }
}

/**
 * Formats a start–end window in the target timezone, explicitly showing dates
 * whenever the window crosses midnight or falls on another calendar date.
 */
export function formatWindowRangeInTz(
  startIso: string,
  endIso: string,
  timezone: string,
  alwaysIncludeDate: boolean = false
): string {
  const startMeta = getLocalHourAndDateKey(startIso, timezone);
  const endMeta = getLocalHourAndDateKey(endIso, timezone);
  const startTime = formatHourInTz(startIso, timezone);
  const endTime = formatHourInTz(endIso, timezone);

  if (!startMeta || !endMeta) return `${startTime} – ${endTime}`;

  if (startMeta.dateKey !== endMeta.dateKey) {
    return `${startMeta.shortDate}, ${startTime} – ${endMeta.shortDate}, ${endTime}`;
  }
  if (alwaysIncludeDate) {
    return `${startMeta.shortDate}, ${startTime} – ${endTime}`;
  }
  return `${startTime} – ${endTime}`;
}

export function formatDateTimeInTz(iso: string, timezone: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  try {
    return parsed.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || "UTC",
    });
  } catch {
    return parsed.toISOString().slice(0, 16).replace("T", " ");
  }
}
