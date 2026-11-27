import type {
  AirQualityForecast,
  AirQualityPoint,
  BudgetTier,
  GeoLocation,
  Locale,
  PollutantSnapshot,
} from "@/types/domain";

export const DEMO_BANNER_COPY: Record<Locale, string> = {
  en: "Demo Data — Not Current Air Quality Readings",
  hi: "डेमो डेटा — वर्तमान वास्तविक वायु गुणवत्ता रीडिंग नहीं",
};

export const DEMO_LOCATIONS: readonly GeoLocation[] = [
  {
    id: "new-delhi",
    name: "New Delhi",
    region: "Delhi NCR",
    country: "India",
    countryCode: "IN",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
  {
    id: "gurugram",
    name: "Gurugram",
    region: "Haryana",
    country: "India",
    countryCode: "IN",
    latitude: 28.4595,
    longitude: 77.0266,
    timezone: "Asia/Kolkata",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    countryCode: "IN",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    region: "Karnataka",
    country: "India",
    countryCode: "IN",
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: "Asia/Kolkata",
  },
  {
    id: "kolkata",
    name: "Kolkata",
    region: "West Bengal",
    country: "India",
    countryCode: "IN",
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: "Asia/Kolkata",
  },
  {
    id: "patna",
    name: "Patna",
    region: "Bihar",
    country: "India",
    countryCode: "IN",
    latitude: 25.5941,
    longitude: 85.1376,
    timezone: "Asia/Kolkata",
  },
] as const;

export const DEFAULT_DEMO_CITY_ID = "new-delhi";

interface DemoCitySeed {
  baseUsAqi: number;
  baseEaqi: number;
  dominantPollutant: keyof PollutantSnapshot;
  pollutants: PollutantSnapshot;
  hourlyCurve: number[];
}

const CITY_SEEDS: Record<string, DemoCitySeed> = {
  "new-delhi": {
    baseUsAqi: 248,
    baseEaqi: 132,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 168.4,
      pm10: 254.0,
      no2: 64.2,
      o3: 38.5,
      so2: 19.4,
      co: 1.85,
    },
    hourlyCurve: [
      268, 274, 279, 282, 285, 288, 280, 266, 248, 224, 198, 178,
      166, 158, 154, 162, 176, 198, 226, 244, 256, 262, 265, 267,
    ],
  },
  gurugram: {
    baseUsAqi: 226,
    baseEaqi: 121,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 149.2,
      pm10: 228.6,
      no2: 58.1,
      o3: 41.0,
      so2: 16.8,
      co: 1.62,
    },
    hourlyCurve: [
      242, 248, 251, 255, 258, 254, 244, 232, 226, 202, 176, 158,
      146, 138, 135, 144, 158, 178, 204, 220, 231, 236, 239, 241,
    ],
  },
  mumbai: {
    baseUsAqi: 124,
    baseEaqi: 72,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 44.8,
      pm10: 88.2,
      no2: 39.6,
      o3: 54.0,
      so2: 14.2,
      co: 0.92,
    },
    hourlyCurve: [
      138, 142, 144, 141, 136, 132, 128, 125, 124, 114, 102, 92,
      86, 82, 80, 86, 94, 104, 118, 126, 132, 135, 137, 138,
    ],
  },
  bengaluru: {
    baseUsAqi: 78,
    baseEaqi: 46,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 24.6,
      pm10: 51.4,
      no2: 29.4,
      o3: 48.2,
      so2: 8.6,
      co: 0.64,
    },
    hourlyCurve: [
      88, 91, 90, 86, 82, 79, 78, 76, 78, 72, 65, 58,
      54, 52, 50, 54, 62, 72, 82, 86, 88, 89, 88, 87,
    ],
  },
  kolkata: {
    baseUsAqi: 186,
    baseEaqi: 104,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 108.5,
      pm10: 174.0,
      no2: 52.3,
      o3: 42.1,
      so2: 17.5,
      co: 1.38,
    },
    hourlyCurve: [
      202, 208, 212, 216, 214, 206, 196, 188, 186, 168, 152, 138,
      128, 122, 120, 128, 142, 160, 182, 194, 200, 204, 205, 204,
    ],
  },
  patna: {
    baseUsAqi: 234,
    baseEaqi: 126,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 156.0,
      pm10: 238.5,
      no2: 49.0,
      o3: 36.8,
      so2: 15.4,
      co: 1.54,
    },
    hourlyCurve: [
      250, 256, 260, 264, 262, 255, 246, 238, 234, 210, 186, 166,
      154, 146, 144, 152, 168, 188, 214, 230, 242, 246, 248, 249,
    ],
  },
};

export const DEMO_SNAPSHOT_ISO = "2026-11-26T08:00:00+05:30";

export function getDemoLocationById(cityId: string): GeoLocation {
  return (
    DEMO_LOCATIONS.find((city) => city.id === cityId) ?? DEMO_LOCATIONS[0]
  );
}

export function getDemoForecast(cityId: string): AirQualityForecast & {
  dominantPollutant: keyof PollutantSnapshot;
} {
  const location = getDemoLocationById(cityId);
  const seed = CITY_SEEDS[location.id] ?? CITY_SEEDS[DEFAULT_DEMO_CITY_ID];
  const baseDate = new Date("2026-11-26T00:00:00+05:30");

  const hourly: AirQualityPoint[] = seed.hourlyCurve.map((aqi, hourIdx) => {
    const pointDate = new Date(baseDate.getTime() + hourIdx * 3600 * 1000);
    const ratio = aqi / seed.baseUsAqi;
    return {
      timestampIso: pointDate.toISOString(),
      usAqi: aqi,
      europeanAqi: Math.round(seed.baseEaqi * ratio),
      pollutants: {
        pm25: seed.pollutants.pm25 ? Number((seed.pollutants.pm25 * ratio).toFixed(1)) : null,
        pm10: seed.pollutants.pm10 ? Number((seed.pollutants.pm10 * ratio).toFixed(1)) : null,
        no2: seed.pollutants.no2 ? Number((seed.pollutants.no2 * ratio).toFixed(1)) : null,
        o3: seed.pollutants.o3 ? Number((seed.pollutants.o3 * ratio).toFixed(1)) : null,
        so2: seed.pollutants.so2 ? Number((seed.pollutants.so2 * ratio).toFixed(1)) : null,
        co: seed.pollutants.co ? Number((seed.pollutants.co * 1000 * ratio).toFixed(0)) : null,
      },
    };
  });

  return {
    location,
    dominantPollutant: seed.dominantPollutant,
    dominantPollutantReason:
      "Illustrative demonstration subindex leader (PM₂.₅) — not a live measurement.",
    units: {
      pm25: "µg/m³",
      pm10: "µg/m³",
      no2: "µg/m³",
      o3: "µg/m³",
      so2: "µg/m³",
      co: "µg/m³",
    },
    utcOffsetSeconds: 19800,
    current: {
      timestampIso: DEMO_SNAPSHOT_ISO,
      usAqi: seed.baseUsAqi,
      europeanAqi: seed.baseEaqi,
      pollutants: {
        ...seed.pollutants,
        co: seed.pollutants.co ? Math.round(seed.pollutants.co * 1000) : null,
      },
      subindices: {
        pm25: seed.baseUsAqi,
        pm10: Math.round(seed.baseUsAqi * 0.62),
        no2: Math.round(seed.baseUsAqi * 0.28),
        o3: Math.round(seed.baseUsAqi * 0.2),
        so2: Math.round(seed.baseUsAqi * 0.14),
        co: Math.round(seed.baseUsAqi * 0.1),
      },
    },
    hourly,
    provenance: {
      sourceName: "VayuWise Demonstration Dataset",
      sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      attributionLabel: "Demo Data — Not Current Air Quality Readings",
      dataSourceType: "demonstration",
      aqiStandard: "US_AQI",
      aqiStandardNote:
        "Illustrative US AQI values for UI demonstration only (distinct from official Indian CPCB NAQI).",
      modelTimestampIso: DEMO_SNAPSHOT_ISO,
      fetchedAtIso: DEMO_SNAPSHOT_ISO,
      freshnessStatus: "demonstration",
      isStale: true,
    },
  };
}

export interface DemoRecommendationItem {
  id: string;
  category: "outdoor" | "commute" | "indoor" | "family";
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
}

export function getDemoRecommendations(usAqi: number): DemoRecommendationItem[] {
  const highPollution = usAqi > 150;
  return [
    {
      id: "rec-outdoor",
      category: "outdoor",
      titleEn: highPollution
        ? "Shift workouts indoors during morning inversion"
        : "Prefer midday window for brief outdoor errands",
      titleHi: highPollution
        ? "सुबह के स्मॉग के दौरान व्यायाम घर के भीतर करें"
        : "बाहरी कामों के लिए दोपहर का समय चुनें",
      detailEn: highPollution
        ? "Demonstration guidance: When US AQI exceeds 150, prioritize respiratory protection over outdoor exercise."
        : "Demonstration guidance: Monitor hourly trends before outdoor activity and adjust intensity if haze rises.",
      detailHi: highPollution
        ? "डेमो मार्गदर्शन: जब US AQI 150 से अधिक हो, तो बाहरी व्यायाम के बजाय श्वसन सुरक्षा को प्राथमिकता दें।"
        : "डेमो मार्गदर्शन: बाहरी गतिविधि से पहले प्रति घंटे के रुझान देखें।",
    },
    {
      id: "rec-commute",
      category: "commute",
      titleEn: highPollution
        ? "Choose enclosed metro/bus or WFH over open-road cycling"
        : "Combine metro or bus trips to cut tailpipe emissions",
      titleHi: highPollution
        ? "खुली सड़क पर साइकिल के बजाय बंद मेट्रो/बस या WFH चुनें"
        : "उत्सर्जन कम करने के लिए मेट्रो या बस का उपयोग करें",
      detailEn: highPollution
        ? "Demonstration guidance: Health protection takes priority over open-air active commuting during severe smog."
        : "Demonstration guidance: Public transit lowers per-trip emissions while limiting direct roadside idling.",
      detailHi: highPollution
        ? "डेमो मार्गदर्शन: गंभीर स्मॉग में खुली हवा की साइकिल यात्रा की तुलना में स्वास्थ्य सुरक्षा प्राथमिकता है।"
        : "डेमो मार्गदर्शन: सार्वजनिक परिवहन यात्रा उत्सर्जन कम करने में मदद करता है।",
    },
    {
      id: "rec-indoor",
      category: "indoor",
      titleEn: "Seal window drafts & run kitchen exhaust during cooking",
      titleHi: "खिड़कियों की दरारें बंद रखें और खाना पकाते समय एग्जॉस्ट चलाएं",
      detailEn:
        "Demonstration guidance: Damp-mop floors instead of dry sweeping and avoid indoor incense or candle smoke.",
      detailHi:
        "डेमो मार्गदर्शन: सूखी झाड़ू के बजाय गीला पोंछा लगाएं और घर के भीतर धुएं से बचें।",
    },
    {
      id: "rec-family",
      category: "family",
      titleEn: "Check fit-tested N95/FFP2 masks for children & seniors",
      titleHi: "बच्चों और वरिष्ठजनों के लिए उपयुक्त मास्क की जांच करें",
      detailEn:
        "Demonstration guidance: Keep essential asthma or respiratory rescue plans handy as advised by your doctor.",
      detailHi:
        "डेमो मार्गदर्शन: अपने चिकित्सक की सलाह के अनुसार आवश्यक श्वसन योजना तैयार रखें।",
    },
  ];
}

export interface DemoAssistantExample {
  question: string;
  answer: string;
}

export const DEMO_ASSISTANT_SUGGESTIONS: readonly string[] = [
  "How can I protect my family during severe smog?",
  "When should I exercise outdoors?",
  "How can I improve indoor air quality on a budget?",
  "Is public transport a better option for my daily commute?",
  "What can my residential community do to reduce pollution?",
] as const;

export const DEMO_ASSISTANT_EXAMPLES: Record<string, string> = {
  "How can I protect my family during severe smog?":
    "Example Preview (Not live Gemini AI): During severe smog, keep windows sealed during morning and late-evening inversion peaks, run kitchen exhaust fans while cooking, avoid indoor smoke sources (incense, candles), and equip family members with well-fitting N95/FFP2 masks for unavoidable outdoor trips. Consult a healthcare professional for personalized medical advice.",
  "When should I exercise outdoors?":
    "Example Preview (Not live Gemini AI): Afternoon hours often show relatively lower particulate concentrations compared to early morning winter inversion, though they are never guaranteed safe during high-AQI days. When US AQI exceeds 150, shift strenuous exercise indoors.",
  "How can I improve indoor air quality on a budget?":
    "Example Preview (Not live Gemini AI): Zero- and low-cost steps include damp mopping rather than dry sweeping, sealing window/door gaps with weatherstripping, venting cooking steam immediately, and limiting cross-ventilation to lower-pollution afternoon windows.",
  "Is public transport a better option for my daily commute?":
    "Example Preview (Not live Gemini AI): Switching from solo petrol/diesel vehicles to metro rail or electric buses lowers shared per-passenger emissions. During severe smog, enclosed metro/AC transit also reduces direct exposure compared to two-wheelers or walking along heavy traffic corridors.",
  "What can my residential community do to reduce pollution?":
    "Example Preview (Not live Gemini AI): Resident welfare associations can enforce zero-leaf-burning policies, encourage carpooling and school-bus pooling, install dust-suppression barriers around construction, and run shared clean-air reading rooms for seniors and children.",
};

export interface DemoPlannerBlock {
  window: "morning" | "midday" | "evening";
  timeRange: string;
  title: string;
  recommendation: string;
  reason: string;
  expectedBenefit: string;
  alternativeAction: string;
}

export const DEMO_PLANNER_BLOCKS: readonly DemoPlannerBlock[] = [
  {
    window: "morning",
    timeRange: "06:00 – 10:30",
    title: "Keep Morning Routine Indoors During Inversion Peak",
    recommendation:
      "Replace early outdoor walks with indoor mobility or stretching and keep balcony doors closed.",
    reason:
      "Cold morning surface air traps fine particulates close to ground level.",
    expectedBenefit:
      "Reduces peak morning particulate inhalation for children, commuters, and seniors.",
    alternativeAction:
      "If morning travel is essential, wear a snug N95/FFP2 mask and choose enclosed metro transit.",
  },
  {
    window: "midday",
    timeRange: "12:30 – 16:00",
    title: "Relatively Lower Dispersion Window for Essential Errands",
    recommendation:
      "Batch grocery or school errands and perform brief 15-minute cross-ventilation only if outdoor AQI dips.",
    reason:
      "Daytime solar warming typically increases atmospheric mixing height compared to dawn.",
    expectedBenefit:
      "Refreshes indoor CO2 buildup without exposing household members to peak morning haze.",
    alternativeAction:
      "If afternoon haze persists above unhealthy thresholds, keep windows sealed and rely on filtration.",
  },
  {
    window: "evening",
    timeRange: "17:30 – 22:00",
    title: "Low-Smoke Dinner Prep & Nighttime Clean-Air Zone",
    recommendation:
      "Use lids on pots, run chimney/exhaust fans, and prepare bedrooms before temperature drops.",
    reason:
      "Cooking aerosols combined with evening traffic and cooling air rapidly spike indoor PM2.5.",
    expectedBenefit:
      "Maintains cleaner overnight sleeping air across bedrooms without additional energy waste.",
    alternativeAction:
      "Consider batch-steaming or pressure-cooking meals instead of high-temperature pan frying.",
  },
] as const;

export interface DemoIndoorRoomTip {
  id: string;
  room: "living_room" | "bedroom" | "kitchen";
  sourceCategory: "cooking" | "infiltration" | "dust" | "combustion";
  budgetTier: BudgetTier;
  title: string;
  action: string;
}

export const DEMO_INDOOR_TIPS: readonly DemoIndoorRoomTip[] = [
  {
    id: "in-1",
    room: "kitchen",
    sourceCategory: "cooking",
    budgetTier: "free",
    title: "Always vent kitchen smoke while cooking",
    action: "Turn on exhaust fan or crack a kitchen-only window and cover pans to limit aerosolized oil/smoke.",
  },
  {
    id: "in-2",
    room: "living_room",
    sourceCategory: "dust",
    budgetTier: "free",
    title: "Damp-mop instead of dry sweeping",
    action: "Dry brooms resuspend settled PM10 and fine dust back into breathing height.",
  },
  {
    id: "in-3",
    room: "living_room",
    sourceCategory: "combustion",
    budgetTier: "free",
    title: "Pause indoor incense, dhoop & scented candles",
    action: "Indoor combustion creates concentrated fine particulates inside closed winter rooms.",
  },
  {
    id: "in-4",
    room: "bedroom",
    sourceCategory: "infiltration",
    budgetTier: "low_cost",
    title: "Seal door & window gaps with foam weatherstripping",
    action: "Affordable adhesive strips significantly reduce smoky outdoor air leaks overnight.",
  },
  {
    id: "in-5",
    room: "bedroom",
    sourceCategory: "infiltration",
    budgetTier: "investment",
    title: "Size a true-HEPA purifier for bedroom CADR",
    action: "Run on medium/auto in the primary sleeping room with doors closed for cleaner overnight recovery.",
  },
] as const;

export interface DemoSustainabilityAction {
  id: string;
  domain: "transport" | "household";
  budgetTier: BudgetTier;
  title: string;
  impactExplanation: string;
  caveat: string;
}

export const DEMO_SUSTAINABILITY_ACTIONS: readonly DemoSustainabilityAction[] = [
  {
    id: "sus-1",
    domain: "transport",
    budgetTier: "free",
    title: "Coordinate 2-day hybrid WFH or carpool with neighbors",
    impactExplanation:
      "Eliminates full round-trip vehicle tailpipe CO2e and brake/tire particulate wear.",
    caveat: "Subject to workplace flexibility; does not change ambient neighborhood AQI alone.",
  },
  {
    id: "sus-2",
    domain: "transport",
    budgetTier: "low_cost",
    title: "Shift solo car commutes to Metro + last-mile e-rickshaw",
    impactExplanation:
      "Cuts per-passenger fossil fuel combustion while keeping riders sheltered during high smog.",
    caveat: "Prefer enclosed transit over open-air walking/cycling when US AQI exceeds 150.",
  },
  {
    id: "sus-3",
    domain: "household",
    budgetTier: "free",
    title: "Air-dry laundry & batch errands into single trips",
    impactExplanation:
      "Reduces household electricity demand and cold-start vehicle emissions.",
    caveat: "Dry laundry indoors away from living areas during heavy outdoor soot days.",
  },
  {
    id: "sus-4",
    domain: "household",
    budgetTier: "investment",
    title: "Transition backup heating/cooking to high-efficiency electric induction",
    impactExplanation:
      "Eliminates indoor NO2 and combustion particulate spikes while reducing fossil gas usage.",
    caveat: "Requires compatible cookware and upfront appliance budget.",
  },
] as const;

export interface DemoCommunityPlaybook {
  id: string;
  setting: "residential" | "school" | "workplace";
  title: string;
  checklist: string[];
  ownerRole: string;
}

export const DEMO_COMMUNITY_PLAYBOOKS: readonly DemoCommunityPlaybook[] = [
  {
    id: "comm-res",
    setting: "residential",
    title: "RWA Zero-Burning & Guard Smog Protocol",
    ownerRole: "Resident Welfare Association",
    checklist: [
      "Ban dry garden leaf and waste burning inside society premises; compost instead.",
      "Provide N95 masks and enclosed shelter breaks for security guards and sanitation staff.",
      "Designate a shared filtered community room for seniors during severe AQI alerts.",
    ],
  },
  {
    id: "comm-school",
    setting: "school",
    title: "School Smog-Alert Outdoor Activity Matrix",
    ownerRole: "School Administration & Parents",
    checklist: [
      "Move morning assemblies and PE indoors when local US AQI exceeds 150.",
      "Establish no-idling drop-off zones at school gates to curb tailpipe exhaust near children.",
      "Promote organized school bus pooling to reduce private car congestion.",
    ],
  },
  {
    id: "comm-work",
    setting: "workplace",
    title: "Commuter Flexibility & Clean-Air Office Charter",
    ownerRole: "Facilities & HR Teams",
    checklist: [
      "Offer flexible remote-work days during severe winter smog advisories.",
      "Subsidize metro transit passes and EV shuttle connections from major hubs.",
      "Maintain HVAC MERV-13/HEPA filter replacement logs visibly for employees.",
    ],
  },
] as const;
