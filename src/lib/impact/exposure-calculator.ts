import { z } from "zod";
import type {
  OutdoorExposureComparisonInput,
  OutdoorExposureComparisonResult,
} from "@/types/domain";

const durationSchema = z
  .number()
  .finite("Duration must be finite.")
  .min(0.25, "Minimum comparison duration is 0.25 hours (15 minutes).")
  .max(12, "Maximum comparison duration is 12 hours.");

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Computes a simplified outdoor ambient concentration-time indicator:
 *   Concentration (ug/m3) * Duration (hours) = ug*h/m3
 *
 * Strictly separate from CO2e emissions math. Never treats AQI as a pollutant concentration
 * and never claims inhaled dose or disease/mortality risk reduction.
 */
export function compareOutdoorConcentrationTime(
  input: OutdoorExposureComparisonInput
): OutdoorExposureComparisonResult {
  const locale = input.locale ?? "en";
  const baseDurParsed = durationSchema.safeParse(input.durationHours);
  const altDurParsed = durationSchema.safeParse(
    input.alternativeDurationHours ?? input.durationHours
  );

  if (!baseDurParsed.success || !altDurParsed.success) {
    return {
      valid: false,
      warningMessage:
        locale === "hi"
          ? "कृपया 0.25 से 12 घंटे के बीच मान्य अवधि चुनें।"
          : "Please choose a valid outdoor duration between 0.25 and 12 hours.",
      healthProtectionPriority: true,
      baselineDurationHours: input.durationHours,
      alternativeDurationHours:
        input.alternativeDurationHours ?? input.durationHours,
      baselineConcentrationTimeUgHrM3: null,
      alternativeConcentrationTimeUgHrM3: null,
      differenceUgHrM3: null,
      unit: "µg·h/m³",
      scientificDisclosure:
        "Simplified ambient concentration-time indicator only (PM2.5 × duration) — not measured inhaled dose or clinical health risk.",
      healthTradeOffNote:
        "Unable to compute comparison for invalid duration.",
    };
  }

  const baseDuration = baseDurParsed.data;
  const altDuration = altDurParsed.data;

  const hasMissingPm25 =
    input.baselinePm25UgM3 === null ||
    input.alternativePm25UgM3 === null ||
    !Number.isFinite(input.baselinePm25UgM3) ||
    !Number.isFinite(input.alternativePm25UgM3);

  const highPollution =
    (input.baselineUsAqi ?? 0) >= 151 || (input.alternativeUsAqi ?? 0) >= 151;

  const isStaleOrDemo =
    input.isStaleForecast ||
    input.dataSourceType === "stale" ||
    input.dataSourceType === "demonstration" ||
    input.dataSourceType === "unavailable";

  if (hasMissingPm25) {
    return {
      valid: false,
      warningMessage:
        locale === "hi"
          ? "चयनित समय स्लॉट के लिए PM2.5 सांद्रता डेटा उपलब्ध नहीं है। केवल उपलब्ध प्रति घंटा PM2.5 की तुलना की जा सकती है; AQI मान को सांद्रता के रूप में उपयोग नहीं किया जाता।"
          : "Hourly PM2.5 concentration data is missing for one or more selected slots. We never substitute US AQI scores as PM2.5 concentration.",
      healthProtectionPriority: true,
      baselineDurationHours: baseDuration,
      alternativeDurationHours: altDuration,
      baselineConcentrationTimeUgHrM3: null,
      alternativeConcentrationTimeUgHrM3: null,
      differenceUgHrM3: null,
      unit: "µg·h/m³",
      scientificDisclosure:
        locale === "hi"
          ? "यह केवल सरलीकृत परिवेश सांद्रता-समय सूचक (µg·h/m³) है — मापी गई श्वसन खुराक या रोग जोखिम नहीं।"
          : "Simplified ambient concentration-time indicator (µg·h/m³) — not measured inhaled dose, indoor air exposure, or clinical risk.",
      healthTradeOffNote:
        locale === "hi"
          ? "अस्पष्ट या अनुपलब्ध डेटा के दौरान भारी बाहरी व्यायाम टालें।"
          : "Avoid heavy outdoor exertion until fresh PM2.5 hourly data is available.",
    };
  }

  const baselineVal = round2((input.baselinePm25UgM3 as number) * baseDuration);
  const altVal = round2((input.alternativePm25UgM3 as number) * altDuration);
  const diff = round2(baselineVal - altVal);

  const warningMessage = isStaleOrDemo
    ? locale === "hi"
      ? "डेटा पुराना या डेमो स्रोत से है — निर्णय लेने से पहले डैशबोर्ड डेटा रीफ़्रेश करें।"
      : "Forecast data is cached/stale or demonstration only — refresh live readings before planning outdoor trips."
    : null;

  const healthTradeOffNote = highPollution
    ? locale === "hi"
      ? "चेतावनी: चयनित अवधि में US AQI अस्वस्थ श्रेणी में है। कम सांद्रता वाला घंटा भी 'सुरक्षित' नहीं है; इनडोर विकल्प को प्राथमिकता दें।"
      : "Health priority override: Ambient US AQI reaches Unhealthy (>= 151). Shifting time lowers ambient PM2.5×hours, but neither slot is risk-free; prefer indoor exercise."
    : diff > 0
      ? locale === "hi"
        ? `वैकल्पिक समय/अवधि में परिवेश PM2.5×घंटे ${diff} µg·h/m³ कम हैं (केवल बाहरी सांद्रता सूचक)।`
        : `Selected alternative lowers ambient PM2.5×hours by ${diff} µg·h/m³ (ambient concentration-time indicator only).`
      : locale === "hi"
        ? "वैकल्पिक स्लॉट में परिवेश PM2.5×घंटे कम नहीं हुए हैं; कम समय या इनडोर गतिविधि चुनें।"
        : "Selected alternative does not reduce ambient PM2.5×hours; shorten duration or shift indoors.";

  return {
    valid: true,
    warningMessage,
    healthProtectionPriority: highPollution,
    baselineDurationHours: baseDuration,
    alternativeDurationHours: altDuration,
    baselineConcentrationTimeUgHrM3: baselineVal,
    alternativeConcentrationTimeUgHrM3: altVal,
    differenceUgHrM3: diff,
    unit: "µg·h/m³",
    scientificDisclosure:
      locale === "hi"
        ? "सरलीकृत परिवेश सांद्रता-समय सूचक (PM2.5 µg/m³ × अवधि घंटे = µg·h/m³)। यह व्यक्तिगत इनहेल्ड डोज़, इनडोर सांद्रता, या स्वास्थ्य जोखिम में प्रतिशत कमी को नहीं मापता।"
        : "Simplified ambient concentration-time indicator (PM2.5 µg/m³ × duration h = µg·h/m³). Does not measure inhaled dose, personal breathing rate, indoor air, or disease/asthma risk reduction.",
    healthTradeOffNote,
  };
}
