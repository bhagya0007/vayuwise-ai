export type AqiBandId =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export interface AqiBandToken {
  id: AqiBandId;
  minUsAqi: number;
  maxUsAqi: number;
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  descriptionHi: string;
  badgeClass: string;
  cssVar: string;
  prioritizeHealthProtection: boolean;
}

/**
 * US EPA AQI bands used to classify Open-Meteo `us_aqi` values.
 * Note: Distinct from official Indian CPCB National AQI (0–500) breakpoints.
 */
export const US_AQI_BANDS: readonly AqiBandToken[] = [
  {
    id: "good",
    minUsAqi: 0,
    maxUsAqi: 50,
    labelEn: "Good",
    labelHi: "अच्छा",
    descriptionEn:
      "Air quality is satisfactory with little or no expected risk from ambient pollutants.",
    descriptionHi:
      "वायु गुणवत्ता संतोषजनक है और सामान्य रूप से जोखिम बहुत कम है।",
    badgeClass:
      "bg-emerald-500/15 text-emerald-900 border-emerald-500/35 dark:text-emerald-300",
    cssVar: "var(--aqi-good)",
    prioritizeHealthProtection: false,
  },
  {
    id: "moderate",
    minUsAqi: 51,
    maxUsAqi: 100,
    labelEn: "Moderate",
    labelHi: "मध्यम",
    descriptionEn:
      "Acceptable for most people; unusually sensitive individuals may experience mild irritation.",
    descriptionHi:
      "अधिकांश लोगों के लिए स्वीकार्य; अत्यधिक संवेदनशील व्यक्तियों को हल्की असुविधा हो सकती है।",
    badgeClass:
      "bg-amber-400/20 text-amber-800 border-amber-500/35 dark:text-amber-300",
    cssVar: "var(--aqi-moderate)",
    prioritizeHealthProtection: false,
  },
  {
    id: "sensitive",
    minUsAqi: 101,
    maxUsAqi: 150,
    labelEn: "Unhealthy for Sensitive Groups",
    labelHi: "संवेदनशील समूहों के लिए अस्वस्थ",
    descriptionEn:
      "Children, older adults, and people with respiratory or heart sensitivities should reduce prolonged outdoor exertion.",
    descriptionHi:
      "बच्चों, बुजुर्गों और श्वसन संवेदनशील लोगों को लंबे समय तक बाहरी श्रम कम करना चाहिए।",
    badgeClass:
      "bg-orange-500/15 text-orange-800 border-orange-500/35 dark:text-orange-300",
    cssVar: "var(--aqi-sensitive)",
    prioritizeHealthProtection: true,
  },
  {
    id: "unhealthy",
    minUsAqi: 151,
    maxUsAqi: 200,
    labelEn: "Unhealthy",
    labelHi: "अस्वस्थ",
    descriptionEn:
      "Everyone may begin to experience respiratory effects; move vigorous workouts indoors and protect vulnerable groups.",
    descriptionHi:
      "सभी को स्वास्थ्य प्रभाव महसूस हो सकते हैं; भारी व्यायाम घर के भीतर करें और संवेदनशील लोगों की रक्षा करें।",
    badgeClass:
      "bg-rose-500/15 text-rose-800 border-rose-500/35 dark:text-rose-300",
    cssVar: "var(--aqi-unhealthy)",
    prioritizeHealthProtection: true,
  },
  {
    id: "very_unhealthy",
    minUsAqi: 201,
    maxUsAqi: 300,
    labelEn: "Very Unhealthy",
    labelHi: "बहुत अस्वस्थ",
    descriptionEn:
      "Elevated health alert across the population. Prioritize indoor clean air and avoid strenuous outdoor activity.",
    descriptionHi:
      "सभी के लिए गंभीर स्वास्थ्य चेतावनी। इनडोर स्वच्छ हवा को प्राथमिकता दें और बाहरी श्रम से बचें।",
    badgeClass:
      "bg-purple-500/15 text-purple-800 border-purple-500/35 dark:text-purple-300",
    cssVar: "var(--aqi-very-unhealthy)",
    prioritizeHealthProtection: true,
  },
  {
    id: "hazardous",
    minUsAqi: 301,
    maxUsAqi: 500,
    labelEn: "Hazardous",
    labelHi: "खतरनाक",
    descriptionEn:
      "Emergency-level conditions where everyone is likely affected. Stay indoors with filtration and limit exposure.",
    descriptionHi:
      "आपातकालीन स्तर का प्रदूषण। घर के भीतर रहें, हवा को फ़िल्टर करें और बाहरी संपर्क सीमित रखें।",
    badgeClass:
      "bg-red-900/25 text-red-900 border-red-600/45 dark:text-red-200",
    cssVar: "var(--aqi-hazardous)",
    prioritizeHealthProtection: true,
  },
] as const;

export const DESIGN_TOKENS = {
  spacing: {
    pageMaxWidth: "max-w-7xl",
    sectionGap: "gap-6 md:gap-8",
    cardPadding: "p-5 md:p-6",
  },
  typography: {
    display: "text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight",
    heading: "text-xl sm:text-2xl font-semibold tracking-tight",
    subheading: "text-base sm:text-lg font-medium",
    body: "text-sm sm:text-base leading-relaxed",
    caption: "text-xs text-muted-foreground",
  },
} as const;

export function getUsAqiBand(usAqi: number): AqiBandToken {
  if (!Number.isFinite(usAqi)) {
    return US_AQI_BANDS[0];
  }
  const rounded = Math.max(0, Math.round(usAqi));
  return (
    US_AQI_BANDS.find(
      (band) => rounded >= band.minUsAqi && rounded <= band.maxUsAqi
    ) ?? US_AQI_BANDS[US_AQI_BANDS.length - 1]
  );
}
