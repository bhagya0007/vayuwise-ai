import type { Locale } from "@/types/domain";

export interface ShellDictionary {
  brandName: string;
  tagline: string;
  phaseBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  languageLabel: string;
  aqiStandardNoticeTitle: string;
  aqiStandardNoticeBody: string;
  healthPriorityTitle: string;
  healthPriorityBody: string;
  impactSeparationTitle: string;
  impactSeparationBody: string;
  foundationChecklistTitle: string;
  architectureModules: readonly {
    title: string;
    phase: string;
    summary: string;
  }[];
  serverStatusLabel: string;
  disclaimer: string;
}

export const SHELL_DICTIONARY: Record<Locale, ShellDictionary> = {
  en: {
    brandName: "VayuWise AI",
    tagline: "Breathe Smarter. Live Greener.",
    phaseBadge: "Open-Meteo Live Intelligence",
    heroTitle: "Location-aware air quality intelligence for winter smog & urban families.",
    heroSubtitle:
      "Converting live modeled pollutant data into personalized, safe, low-emission daily routines, indoor air quality hacks, and transparent environmental impact.",
    languageLabel: "हिन्दी",
    aqiStandardNoticeTitle: "Transparent AQI & Data Provenance",
    aqiStandardNoticeBody:
      "Every reading explicitly distinguishes live modeled, cached, stale, and demonstration sources. Open-Meteo US AQI is never mislabeled as official Indian CPCB NAQI.",
    healthPriorityTitle: "Health Protection First",
    healthPriorityBody:
      "During severe smog episodes, protective indoor and respiratory guidance overrides outdoor eco-commuting. No medical diagnoses are ever fabricated.",
    impactSeparationTitle: "Separate Climate & Exposure Math",
    impactSeparationBody:
      "Deterministic CO2e savings are calculated independently from personal PM2.5 exposure reduction so choices stay scientifically honest.",
    foundationChecklistTitle: "Foundation Architecture Ready",
    architectureModules: [
      {
        title: "Open-Meteo Air Quality & Geocoding",
        phase: "Active",
        summary: "Typed service interfaces with live modeled, cached, and stale provenance.",
      },
      {
        title: "Bilingual Family & Lifestyle Profile",
        phase: "Active",
        summary: "Strict Zod-validated localStorage preferences for sensitive groups & budgets.",
      },
      {
        title: "Server-Side @google/genai Orchestration",
        phase: "Active",
        summary: "API key isolated to server routes with structured Zod output validation.",
      },
      {
        title: "Deterministic CO2e & Exposure Engine",
        phase: "Active",
        summary: "Transparent emissions math, what-if comparisons, and progress tracking.",
      },
    ],
    serverStatusLabel: "Live Modeled Feed Ready",
    disclaimer:
      "VayuWise AI provides informational environmental guidance only and is not a substitute for clinical medical advice.",
  },
  hi: {
    brandName: "VayuWise AI",
    tagline: "समझदारी से सांस लें। हरित जीवन जिएं।",
    phaseBadge: "Open-Meteo लाइव इंटेलिजेंस",
    heroTitle: "सर्दियों के स्मॉग और शहरी परिवारों के लिए स्थान-आधारित वायु गुणवत्ता सहायक।",
    heroSubtitle:
      "मॉडल्ड वायु प्रदूषण डेटा को सुरक्षित, कम-उत्सर्जन दैनिक दिनचर्या, इनडोर वायु गुणवत्ता उपायों और स्पष्ट पर्यावरणीय प्रभाव में बदलता है।",
    languageLabel: "English",
    aqiStandardNoticeTitle: "पारदर्शी AQI और डेटा स्रोत",
    aqiStandardNoticeBody:
      "हर रीडिंग स्पष्ट रूप से लाइव मॉडल्ड, कैश्ड, पुराना या डेमो स्रोत दिखाती है। Open-Meteo US AQI को कभी भी आधिकारिक भारतीय CPCB NAQI नहीं बताया जाता।",
    healthPriorityTitle: "स्वास्थ्य सुरक्षा सर्वोपरि",
    healthPriorityBody:
      "गंभीर प्रदूषण के दौरान बाहरी पर्यावरण-अनुकूल गतिविधियों की तुलना में इनडोर और श्वसन सुरक्षा को प्राथमिकता दी जाती है। कोई चिकित्सीय निदान नहीं दिया जाता।",
    impactSeparationTitle: "जलवायु और व्यक्तिगत जोखिम की अलग गणना",
    impactSeparationBody:
      "CO2e बचत की गणना व्यक्तिगत PM2.5 एक्सपोज़र से अलग रखी जाती है ताकि हर सुझाव वैज्ञानिक रूप से सटीक रहे।",
    foundationChecklistTitle: "आधारभूत संरचना तैयार",
    architectureModules: [
      {
        title: "Open-Meteo वायु गुणवत्ता एवं जियोकोडिंग",
        phase: "सक्रिय",
        summary: "लाइव मॉडल्ड, कैश्ड और पुराने डेटा के स्पष्ट लेबल के साथ टाइप्ड सेवा अनुबंध।",
      },
      {
        title: "द्विभाषी परिवार एवं जीवनशैली प्रोफ़ाइल",
        phase: "सक्रिय",
        summary: "संवेदनशील समूहों और बजट के लिए Zod-सत्यापित localStorage प्राथमिकताएँ।",
      },
      {
        title: "सर्वर-साइड @google/genai एकीकरण",
        phase: "चरण 03",
        summary: "सर्वर रूट्स में सुरक्षित API कुंजी और संरचित Zod आउटपुट सत्यापन।",
      },
      {
        title: "नियतात्मक CO2e और एक्सपोज़र इंजन",
        phase: "सक्रिय",
        summary: "पारदर्शी उत्सर्जन गणना, व्हाट-इफ तुलना और प्रगति ट्रैकिंग।",
      },
    ],
    serverStatusLabel: "लाइव मॉडल्ड फ़ीड सक्रिय",
    disclaimer:
      "VayuWise AI केवल पर्यावरणीय जानकारी प्रदान करता है और यह चिकित्सीय सलाह का विकल्प नहीं है।",
  },
};

export interface NavLabels {
  home: string;
  dashboard: string;
  planner: string;
  indoorAir: string;
  sustainability: string;
  impact: string;
  community: string;
  report: string;
  assistant: string;
  profile: string;
  settings: string;
}

export interface LandingCopy {
  nav: {
    home: string;
    features: string;
    howItWorks: string;
    about: string;
    launchAssistant: string;
  };
  hero: {
    badge: string;
    headlineLine1: string;
    headlineLine2: string;
    supportingHeadline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    smogLabel: string;
    cleanLabel: string;
    previewBadge: string;
  };
  preview: {
    eyebrow: string;
    title: string;
    description: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    description: string;
    cards: readonly { title: string; body: string }[];
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    items: readonly { title: string; body: string; href: string; tag: string }[];
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    steps: readonly { step: string; title: string; body: string }[];
  };
  trust: {
    eyebrow: string;
    title: string;
    description: string;
    pillars: readonly { title: string; body: string }[];
  };
  finalCta: {
    title: string;
    body: string;
    cta: string;
  };
  footer: {
    attribution: string;
    privacy: string;
    disclaimer: string;
  };
}

export interface DashboardCopy {
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  preparedFor: string;
  searchPlaceholder: string;
  searchLabel: string;
  searchingLabel: string;
  noSearchResults: string;
  searchError: string;
  useMyLocation: string;
  locatingLabel: string;
  recentCitiesLabel: string;
  refreshLabel: string;
  refreshedToast: string;
  usAqiTitle: string;
  usAqiNote: string;
  dominantPollutant: string;
  modelTimestamp: string;
  fetchedAt: string;
  pollutantsTitle: string;
  pollutantsSubtitle: string;
  forecastTitle: string;
  forecastSubtitle: string;
  horizon24h: string;
  horizon48h: string;
  lowestLabel: string;
  highestLabel: string;
  validHoursLabel: string;
  unhealthyHoursLabel: string;
  lowerWindowTitle: string;
  lowerWindowCautionNote: string;
  window1h: string;
  window2h: string;
  insightsTitle: string;
  recommendationsTitle: string;
  recommendationsSubtitle: string;
  quickActionsTitle: string;
  quickActions: readonly { label: string; href: string }[];
  unavailableTitle: string;
  unavailableBody: string;
  retryLabel: string;
  switchToDemoLabel: string;
  returnToLiveLabel: string;
  freshnessLabels: {
    fresh: string;
    cached: string;
    stale: string;
    demonstration: string;
    unavailable: string;
  };
}

export interface AppDictionary {
  brandName: string;
  tagline: string;
  languageSwitchLabel: string;
  themeLightLabel: string;
  themeDarkLabel: string;
  navGroups: {
    intelligence: string;
    action: string;
    personalize: string;
  };
  nav: NavLabels;
  landing: LandingCopy;
  dashboard: DashboardCopy;
  common: {
    demoBanner: string;
    phasePlannedNotice: string;
    skipToContent: string;
    menuLabel: string;
    collapseSidebar: string;
    expandSidebar: string;
  };
}

export function formatHouseholdLabel(
  adults: number,
  children: number,
  seniors: number,
  locale: Locale
): string {
  if (locale === "hi") {
    const parts = [`${adults} वयस्क`];
    if (children > 0) parts.push(`${children} ${children === 1 ? "बच्चा" : "बच्चे"}`);
    if (seniors > 0) parts.push(`${seniors} वरिष्ठजन`);
    return parts.join(", ");
  }

  const parts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];
  if (children > 0) {
    parts.push(`${children} ${children === 1 ? "child" : "children"}`);
  }
  if (seniors > 0) {
    parts.push(`${seniors} ${seniors === 1 ? "senior" : "seniors"}`);
  }
  return parts.join(", ");
}

export const APP_DICTIONARY: Record<Locale, AppDictionary> = {
  en: {
    brandName: "VayuWise AI",
    tagline: "Breathe Smarter. Live Greener.",
    languageSwitchLabel: "हिन्दी",
    themeLightLabel: "Light",
    themeDarkLabel: "Dark",
    navGroups: {
      intelligence: "Intelligence",
      action: "Action & Community",
      personalize: "Personalize",
    },
    nav: {
      home: "Landing Page",
      dashboard: "Air Dashboard",
      planner: "Daily Planner",
      indoorAir: "Indoor Air Coach",
      sustainability: "Sustainability Hub",
      impact: "Impact Calculator",
      community: "Community Mode",
      report: "Printable Report",
      assistant: "Ask Vayu AI",
      profile: "Family Profile",
      settings: "Settings",
    },
    landing: {
      nav: {
        home: "Home",
        features: "Features",
        howItWorks: "How It Works",
        about: "Methodology",
        launchAssistant: "Launch Assistant",
      },
      hero: {
        badge: "PromptWars Challenge 6 · Environmental Intelligence",
        headlineLine1: "Breathe Smarter.",
        headlineLine2: "Live Greener.",
        supportingHeadline: "Intelligence for the air you breathe.",
        description:
          "Your intelligent companion for navigating urban air pollution, protecting your family and making sustainable everyday choices.",
        primaryCta: "Launch Assistant",
        secondaryCta: "Explore Features",
        smogLabel: "Winter Smog Layer",
        cleanLabel: "Clean Air Routine",
        previewBadge: "Illustrative Preview · Live Open-Meteo Inside Dashboard",
      },
      preview: {
        eyebrow: "Product Architecture",
        title: "A command center designed for winter smog clarity, not chart clutter.",
        description:
          "Open the live dashboard to query real Open-Meteo / CAMS modeled air quality, compare 48-hour dispersion windows, and inspect rule-based health protection.",
      },
      problem: {
        eyebrow: "Environmental Storytelling",
        title: "When winter inversion traps smog, raw numbers leave families guessing.",
        description:
          "Cold stagnant air concentrates fine particulates near street level across South Asian and global megacities, turning school commutes, exercise, and window ventilation into daily trade-offs.",
        cards: [
          {
            title: "Morning & Evening Inversions",
            body: "Cooler air locks particulates near ground level, driving sharp intraday swings that daily averages hide.",
          },
          {
            title: "Indoor Penetration of PM₂.₅",
            body: "Fine particulates and indoor cooking smoke accumulate rapidly when winter homes stay closed without targeted filtration.",
          },
          {
            title: "Health vs. Eco Trade-Offs",
            body: "Walking or cycling is green on clean days, yet during severe smog respiratory protection indoors must come first.",
          },
        ],
      },
      features: {
        eyebrow: "Capabilities Bento",
        title: "Six focused modules built around honest environmental intelligence.",
        description:
          "Live Open-Meteo air quality and global city search run today; Gemini AI generation and deterministic CO₂e math join in upcoming phases.",
        items: [
          {
            title: "Air Quality Intelligence",
            body: "Live modeled US AQI, subindex dominant pollutant detection, six pollutant cards with real sparklines, and 24h/48h forecasts.",
            href: "/dashboard",
            tag: "Live Open-Meteo / CAMS",
          },
          {
            title: "AI Daily Planning",
            body: "Morning, midday, and evening timelines adapting outdoor schedules to inversion dips and family sensitivity.",
            href: "/planner",
            tag: "Timeline Preview",
          },
          {
            title: "Indoor Air Coaching",
            body: "Room-specific checklists covering cooking exhaust, infiltration sealing, and zero-combustion habits.",
            href: "/indoor-air",
            tag: "Room Coach",
          },
          {
            title: "Sustainable Alternatives",
            body: "Budget-tiered commute and household swaps balancing emissions reduction with respiratory safety.",
            href: "/sustainability",
            tag: "Budget Tiers",
          },
          {
            title: "Environmental Impact",
            body: "Scenario layout keeping climate emissions cleanly separate from personal pollutant inhalation.",
            href: "/impact",
            tag: "Transparent Math",
          },
          {
            title: "Community Intelligence",
            body: "Coordinated smog-alert checklists for residential societies, schools, and workplaces.",
            href: "/community",
            tag: "RWA & Schools",
          },
        ],
      },
      howItWorks: {
        eyebrow: "Connected Workflow",
        title: "Four transparent steps from city atmosphere to daily protection.",
        steps: [
          {
            step: "01",
            title: "Discover local air conditions",
            body: "Search any Indian or global city via Open-Meteo Geocoding or use optional browser coordinates to load modeled US AQI and hourly dispersion.",
          },
          {
            step: "02",
            title: "Personalize your lifestyle",
            body: "Configure household composition, commute mode, and budget locally in your browser without mandatory accounts or sensitive medical records.",
          },
          {
            step: "03",
            title: "Receive intelligent recommendations",
            body: "Deterministic health-first safety rules and live server-side Gemini AI convert pollutant conditions into actionable guidance.",
          },
          {
            step: "04",
            title: "Understand your environmental impact",
            body: "Compare commute alternatives transparently with clear methodology and zero inflated savings or fabricated statistics.",
          },
        ],
      },
      trust: {
        eyebrow: "Scientific Honesty & Privacy",
        title: "Clear data provenance at every layer.",
        description:
          "VayuWise AI labels live modeled Open-Meteo / CAMS feeds, cached/stale states, and demonstration previews distinctly — and never misrepresents US AQI as official Indian CPCB NAQI.",
        pillars: [
          {
            title: "Modeled Data Attribution",
            body: "Air quality forecasts use Open-Meteo / CAMS regional atmospheric modeling and GeoNames location search; street-level exposure near traffic may differ.",
          },
          {
            title: "Server-Only AI Guardrails",
            body: "Planned Gemini calls execute strictly server-side via @google/genai with Zod validation and non-diagnostic health disclaimers.",
          },
          {
            title: "Privacy-First Local Storage",
            body: "Household preferences remain in browser localStorage. Precise GPS coordinates are never saved automatically.",
          },
        ],
      },
      finalCta: {
        title: "Check your city’s modeled air quality and next 48-hour dispersion.",
        body: "Explore live Open-Meteo data, rule-based health protection, and relatively lower-pollution windows right now.",
        cta: "Open Air Dashboard",
      },
      footer: {
        attribution:
          "Data & location attribution: Open-Meteo Air Quality API (CAMS), Open-Meteo Geocoding API (GeoNames). Planned AI: Google Gemini.",
        privacy:
          "Privacy: Zero mandatory login; city & lifestyle preferences remain in localStorage only.",
        disclaimer:
          "Informational environmental guidance only — not medical diagnosis or clinical advice.",
      },
    },
    dashboard: {
      greetingMorning: "Good morning",
      greetingAfternoon: "Good afternoon",
      greetingEvening: "Good evening",
      preparedFor: "Tailored for",
      searchPlaceholder: "Search city (e.g. Delhi, Noida, Mumbai, London)...",
      searchLabel: "Search cities worldwide",
      searchingLabel: "Searching locations...",
      noSearchResults: "No matching cities found. Try another spelling or include country.",
      searchError: "Location search is temporarily unavailable.",
      useMyLocation: "Use My Location",
      locatingLabel: "Detecting...",
      recentCitiesLabel: "Quick & Recent Cities",
      refreshLabel: "Refresh",
      refreshedToast: "Modeled air quality data refreshed.",
      usAqiTitle: "US AQI (Modeled)",
      usAqiNote:
        "Modeled US EPA AQI via Open-Meteo / CAMS — distinct from official Indian CPCB NAQI ground stations.",
      dominantPollutant: "Dominant Pollutant",
      modelTimestamp: "Model time",
      fetchedAt: "Fetched",
      pollutantsTitle: "Pollutant Intelligence",
      pollutantsSubtitle:
        "Concentration readings with 24-hour hourly sparklines rendered only from valid Open-Meteo time-series points.",
      forecastTitle: "Pollution Forecast",
      forecastSubtitle:
        "Hourly modeled outlook crossing local midnight cleanly. Lower-AQI periods indicate relatively lower stress — never guaranteed safe air.",
      horizon24h: "24 Hours",
      horizon48h: "48 Hours",
      lowestLabel: "Lowest Forecast",
      highestLabel: "Peak Forecast",
      validHoursLabel: "Valid Hours",
      unhealthyHoursLabel: "Unhealthy+ Hours",
      lowerWindowTitle: "Relatively Lower-Exposure Windows",
      lowerWindowCautionNote:
        "Compares consecutive valid hourly averages; lower modeled AQI does not guarantee safe outdoor exercise.",
      window1h: "1-Hour Window",
      window2h: "2-Hour Window",
      insightsTitle: "Air Quality Insights",
      recommendationsTitle: "Rule-Based Health & Daily Guidance",
      recommendationsSubtitle:
        "Deterministic, evidence-informed health baseline guidance (not AI-generated).",
      quickActionsTitle: "Explore Modules",
      quickActions: [
        { label: "Open Daily Planner", href: "/planner" },
        { label: "Indoor Air Coach", href: "/indoor-air" },
        { label: "Sustainability Hub", href: "/sustainability" },
        { label: "Impact Calculator", href: "/impact" },
        { label: "Ask Vayu AI", href: "/assistant" },
        { label: "Community Mode", href: "/community" },
        { label: "Printable Report", href: "/report" },
      ],
      unavailableTitle: "Live Air Quality Unavailable",
      unavailableBody:
        "Unable to load modeled air quality from Open-Meteo right now and no recent cache is available for this location.",
      retryLabel: "Retry Live Fetch",
      switchToDemoLabel: "View Clearly Labeled Demo Mode",
      returnToLiveLabel: "Switch Back to Live Feed",
      freshnessLabels: {
        fresh: "Live Modeled · Open-Meteo / CAMS",
        cached: "Cached Modeled · Open-Meteo / CAMS",
        stale: "Stale Cached Data · Retry Recommended",
        demonstration: "Demo Data — Not Current Air Quality Readings",
        unavailable: "Unavailable",
      },
    },
    common: {
      demoBanner: "Demo Data — Not Current Air Quality Readings",
      phasePlannedNotice:
        "Personalized planning, indoor protection, impact calculations, and printable reports.",
      skipToContent: "Skip to main content",
      menuLabel: "Open navigation menu",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
    },
  },
  hi: {
    brandName: "VayuWise AI",
    tagline: "समझदारी से सांस लें। हरित जीवन जिएं।",
    languageSwitchLabel: "English",
    themeLightLabel: "लाइट",
    themeDarkLabel: "डार्क",
    navGroups: {
      intelligence: "इंटेलिजेंस",
      action: "कार्रवाई व समुदाय",
      personalize: "प्रोफ़ाइल",
    },
    nav: {
      home: "मुख्य पृष्ठ",
      dashboard: "वायु डैशबोर्ड",
      planner: "दैनिक योजना",
      indoorAir: "इनडोर वायु कोच",
      sustainability: "हरित विकल्प",
      impact: "प्रभाव कैलकुलेटर",
      community: "समुदाय योजना",
      report: "प्रिंट रिपोर्ट",
      assistant: "Vayu AI से पूछें",
      profile: "परिवार प्रोफ़ाइल",
      settings: "सेटिंग्स",
    },
    landing: {
      nav: {
        home: "होम",
        features: "विशेषताएँ",
        howItWorks: "कैसे काम करता है",
        about: "पद्धति",
        launchAssistant: "सहायक खोलें",
      },
      hero: {
        badge: "PromptWars चैलेंज 6 · पर्यावरणीय इंटेलिजेंस",
        headlineLine1: "समझदारी से सांस लें।",
        headlineLine2: "हरित जीवन जिएं।",
        supportingHeadline: "आपकी सांसों की हवा के लिए सटीक मार्गदर्शन।",
        description:
          "शहरी वायु प्रदूषण से निपटने, अपने परिवार की सुरक्षा करने और रोज़मर्रा के टिकाऊ विकल्प चुनने के लिए आपका बुद्धिमान साथी।",
        primaryCta: "सहायक खोलें",
        secondaryCta: "विशेषताएँ देखें",
        smogLabel: "सर्दियों का स्मॉग",
        cleanLabel: "स्वच्छ वायु दिनचर्या",
        previewBadge: "उदाहरण पूर्वावलोकन · डैशबोर्ड में लाइव Open-Meteo डेटा",
      },
      preview: {
        eyebrow: "उत्पाद आर्किटेक्चर",
        title: "स्मॉग की स्पष्ट समझ के लिए डिज़ाइन किया गया कमांड सेंटर।",
        description:
          "लाइव डैशबोर्ड में वास्तविक Open-Meteo / CAMS मॉडल्ड डेटा, 48-घंटे का पूर्वानुमान और नियम-आधारित स्वास्थ्य सुरक्षा मार्गदर्शन देखें।",
      },
      problem: {
        eyebrow: "पर्यावरणीय चुनौती",
        title: "जब सर्दियों का स्मॉग बढ़ता है, तो केवल संख्याएँ परिवारों को सही रास्ता नहीं बतातीं।",
        description:
          "ठंडी स्थिर हवा सूक्ष्म कणों को ज़मीन के पास रोक लेती है, जिससे स्कूल यात्रा, व्यायाम और वेंटिलेशन के निर्णय कठिन हो जाते हैं।",
        cards: [
          {
            title: "सुबह व शाम का व्युत्क्रमण",
            body: "ठंडी हवा प्रदूषकों को ज़मीन के करीब रोकती है जिससे दिनभर भारी उतार-चढ़ाव होता है।",
          },
          {
            title: "घर के भीतर PM₂.₅ का जमाव",
            body: "सर्दियों में बंद कमरों में बाहरी धुंध और खाना पकाने का धुआं तेज़ी से जमा होता है।",
          },
          {
            title: "स्वास्थ्य बनाम हरित विकल्प",
            body: "साफ दिनों में पैदल या साइकिल चलना उत्तम है, पर गंभीर स्मॉग में स्वास्थ्य सुरक्षा सर्वोपरि है।",
          },
        ],
      },
      features: {
        eyebrow: "बेंटो क्षमताएँ",
        title: "ईमानदार पर्यावरणीय इंटेलिजेंस के लिए छह केंद्रित मॉड्यूल।",
        description:
          "लाइव Open-Meteo डेटा और शहर खोज अभी सक्रिय हैं; Gemini AI और नियतात्मक CO₂e गणना अगले चरणों में जुड़ेंगी।",
        items: [
          {
            title: "वायु गुणवत्ता इंटेलिजेंस",
            body: "लाइव मॉडल्ड US AQI, उप-सूचकांक प्रमुख प्रदूषक और 24/48-घंटे का पूर्वानुमान।",
            href: "/dashboard",
            tag: "लाइव Open-Meteo",
          },
          {
            title: "AI दैनिक योजना",
            body: "सुबह, दोपहर और शाम की दिनचर्या जो स्मॉग और पारिवारिक सुरक्षा के अनुरूप हो।",
            href: "/planner",
            tag: "टाइमलाइन",
          },
          {
            title: "इनडोर वायु कोच",
            body: "कमरे के अनुसार वेंटिलेशन और धुआं कम करने की व्यावहारिक चेकलिस्ट।",
            href: "/indoor-air",
            tag: "कमरा कोच",
          },
          {
            title: "टिकाऊ विकल्प",
            body: "बजट के अनुसार यात्रा और घरेलू ऊर्जा के सुरक्षित विकल्प।",
            href: "/sustainability",
            tag: "बजट श्रेणियाँ",
          },
          {
            title: "पर्यावरणीय प्रभाव",
            body: "जलवायु उत्सर्जन और व्यक्तिगत जोखिम को अलग रखने वाला पारदर्शी ढांचा।",
            href: "/impact",
            tag: "पारदर्शी गणित",
          },
          {
            title: "सामुदायिक योजना",
            body: "रिहायशी सोसायटी, स्कूलों और कार्यस्थलों के लिए स्मॉग-अलर्ट चेकलिस्ट।",
            href: "/community",
            tag: "RWA व स्कूल",
          },
        ],
      },
      howItWorks: {
        eyebrow: "कैसे काम करता है",
        title: "शहर की हवा से घरेलू सुरक्षा तक चार स्पष्ट चरण।",
        steps: [
          {
            step: "01",
            title: "स्थानीय वायु स्थिति जानें",
            body: "Open-Meteo जियोकोडिंग से कोई भी भारतीय या वैश्विक शहर खोजें और 48-घंटे का पूर्वानुमान देखें।",
          },
          {
            step: "02",
            title: "जीवनशैली अनुकूलित करें",
            body: "बिना लॉगिन के अपने ब्राउज़र में परिवार, यात्रा माध्यम और बजट की प्राथमिकताएँ सहेजें।",
          },
          {
            step: "03",
            title: "बुद्धिमान सुझाव पाएं",
            body: "नियतात्मक स्वास्थ्य-सुरक्षा नियम और लाइव Gemini AI प्रदूषण स्तर को व्यावहारिक दैनिक सलाह में बदलते हैं।",
          },
          {
            step: "04",
            title: "अपना पर्यावरणीय प्रभाव समझें",
            body: "बिना बढ़ा-चढ़ाकर किए गए दावों के, स्पष्ट पद्धति से विकल्पों की तुलना करें।",
          },
        ],
      },
      trust: {
        eyebrow: "वैज्ञानिक ईमानदारी व गोपनीयता",
        title: "हर स्तर पर स्पष्ट डेटा स्रोत।",
        description:
          "VayuWise AI लाइव मॉडल्ड Open-Meteo / CAMS, कैश्ड, पुराना और डेमो डेटा स्पष्ट रूप से अलग दिखाता है — और US AQI को कभी भारतीय CPCB NAQI नहीं बताता।",
        pillars: [
          {
            title: "मॉडल्ड डेटा श्रेय",
            body: "पूर्वानुमान Open-Meteo / CAMS क्षेत्रीय मॉडल और GeoNames पर आधारित हैं; सड़क स्तर का प्रदूषण भिन्न हो सकता है।",
          },
          {
            title: "सर्वर-स्तरीय AI सुरक्षा",
            body: "Gemini कॉल केवल सर्वर पर @google/genai, सुरक्षा फ़िल्टर और Zod सत्यापन के साथ चलते हैं।",
          },
          {
            title: "स्थानीय गोपनीयता",
            body: "प्राथमिकताएँ केवल localStorage में रहती हैं। सटीक GPS निर्देशांक स्थायी रूप से सहेजे नहीं जाते।",
          },
        ],
      },
      finalCta: {
        title: "अपने शहर की मॉडल्ड वायु गुणवत्ता और अगले 48 घंटों का पूर्वानुमान देखें।",
        body: "लाइव Open-Meteo डेटा, नियम-आधारित स्वास्थ्य सुरक्षा और अपेक्षाकृत कम-प्रदूषण अवधि अभी जांचें।",
        cta: "वायु डैशबोर्ड खोलें",
      },
      footer: {
        attribution:
          "डेटा व स्थान श्रेय: Open-Meteo Air Quality API (CAMS), Open-Meteo Geocoding API (GeoNames)। नियोजित AI: Google Gemini।",
        privacy:
          "गोपनीयता: अनिवार्य लॉगिन नहीं; शहर व जीवनशैली प्राथमिकताएँ केवल localStorage में रहती हैं।",
        disclaimer:
          "केवल सूचनात्मक पर्यावरणीय मार्गदर्शन — यह चिकित्सीय निदान या सलाह नहीं है।",
      },
    },
    dashboard: {
      greetingMorning: "सुप्रभात",
      greetingAfternoon: "नमस्कार",
      greetingEvening: "शुभ संध्या",
      preparedFor: "अनुकूलित प्रोफ़ाइल:",
      searchPlaceholder: "शहर खोजें (जैसे Delhi, Noida, Mumbai, London)...",
      searchLabel: "दुनिया भर के शहर खोजें",
      searchingLabel: "शहर खोजे जा रहे हैं...",
      noSearchResults: "कोई शहर नहीं मिला। दूसरी वर्तनी या देश का नाम लिखें।",
      searchError: "स्थान खोज अस्थायी रूप से अनुपलब्ध है।",
      useMyLocation: "मेरा स्थान उपयोग करें",
      locatingLabel: "खोजा जा रहा है...",
      recentCitiesLabel: "त्वरित व हाल के शहर",
      refreshLabel: "रीफ़्रेश",
      refreshedToast: "मॉडल्ड वायु गुणवत्ता डेटा रीफ़्रेश किया गया।",
      usAqiTitle: "US AQI (मॉडल्ड)",
      usAqiNote:
        "Open-Meteo / CAMS द्वारा मॉडल्ड US EPA AQI — आधिकारिक भारतीय CPCB NAQI ग्राउंड स्टेशनों से भिन्न।",
      dominantPollutant: "प्रमुख प्रदूषक",
      modelTimestamp: "मॉडल समय",
      fetchedAt: "प्राप्त समय",
      pollutantsTitle: "प्रमुख प्रदूषक विश्लेषण",
      pollutantsSubtitle:
        "केवल वैध Open-Meteo प्रति घंटा मानों से बने 24-घंटे के मिनी ग्राफ़।",
      forecastTitle: "प्रदूषण पूर्वानुमान",
      forecastSubtitle:
        "स्थानीय समय के अनुसार प्रति घंटा मॉडल्ड रुझान। कम-AQI अवधि का अर्थ पूर्णतः सुरक्षित हवा नहीं है।",
      horizon24h: "24 घंटे",
      horizon48h: "48 घंटे",
      lowestLabel: "न्यूनतम पूर्वानुमान",
      highestLabel: "उच्चतम पूर्वानुमान",
      validHoursLabel: "वैध घंटे",
      unhealthyHoursLabel: "अस्वस्थ+ घंटे",
      lowerWindowTitle: "अपेक्षाकृत कम-प्रदूषण अवधि",
      lowerWindowCautionNote:
        "क्रमिक वैध प्रति घंटा औसत की तुलना; कम AQI बाहरी व्यायाम की सुरक्षा की गारंटी नहीं देता।",
      window1h: "1-घंटे की अवधि",
      window2h: "2-घंटे की अवधि",
      insightsTitle: "वायु गुणवत्ता अंतर्दृष्टि",
      recommendationsTitle: "नियम-आधारित स्वास्थ्य व दैनिक मार्गदर्शन",
      recommendationsSubtitle:
        "नियतात्मक, साक्ष्य-आधारित स्वास्थ्य मार्गदर्शन (AI-जनित नहीं)।",
      quickActionsTitle: "मॉड्यूल खोलें",
      quickActions: [
        { label: "दैनिक योजना खोलें", href: "/planner" },
        { label: "इनडोर वायु कोच", href: "/indoor-air" },
        { label: "हरित विकल्प केंद्र", href: "/sustainability" },
        { label: "प्रभाव कैलकुलेटर", href: "/impact" },
        { label: "Vayu AI से पूछें", href: "/assistant" },
        { label: "समुदाय योजना", href: "/community" },
        { label: "प्रिंट रिपोर्ट", href: "/report" },
      ],
      unavailableTitle: "लाइव वायु गुणवत्ता अनुपलब्ध",
      unavailableBody:
        "अभी Open-Meteo से मॉडल्ड डेटा लोड नहीं हो सका और इस स्थान के लिए कोई हालिया कैश उपलब्ध नहीं है।",
      retryLabel: "पुनः प्रयास करें",
      switchToDemoLabel: "डेमो मोड देखें (स्पष्ट लेबल सहित)",
      returnToLiveLabel: "लाइव फ़ीड पर लौटें",
      freshnessLabels: {
        fresh: "लाइव मॉडल्ड · Open-Meteo / CAMS",
        cached: "कैश्ड मॉडल्ड · Open-Meteo / CAMS",
        stale: "पुराना कैश्ड डेटा · पुनः प्रयास करें",
        demonstration: "डेमो डेटा — वर्तमान वास्तविक रीडिंग नहीं",
        unavailable: "अनुपलब्ध",
      },
    },
    common: {
      demoBanner: "डेमो डेटा — वर्तमान वास्तविक वायु गुणवत्ता रीडिंग नहीं",
      phasePlannedNotice:
        "व्यक्तिगत योजना, इनडोर सुरक्षा, प्रभाव गणना और प्रिंट रिपोर्ट।",
      skipToContent: "मुख्य सामग्री पर जाएं",
      menuLabel: "नेविगेशन मेनू खोलें",
      collapseSidebar: "साइडबार समेटें",
      expandSidebar: "साइडबार विस्तार करें",
    },
  },
};
