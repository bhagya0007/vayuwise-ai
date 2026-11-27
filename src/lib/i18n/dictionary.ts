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
      intelligence: "TODAY",
      action: "TAKE ACTION",
      personalize: "ACCOUNT & TOOLS",
    },
    nav: {
      home: "Landing Page",
      dashboard: "Overview",
      planner: "Daily Plan",
      indoorAir: "Home Air",
      sustainability: "Green Choices",
      impact: "My Impact",
      community: "Community",
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
        badge: "Urban Air Quality Assistant",
        headlineLine1: "Breathe Smarter.",
        headlineLine2: "Live Greener.",
        supportingHeadline:
          "Know your air quality. Protect your family. Make greener choices with AI.",
        description:
          "Live modeled air quality, practical daily routines, home air tips, and clear commute impact in English and Hindi.",
        primaryCta: "Get Started",
        secondaryCta: "Explore Features",
        smogLabel: "Heavy Smog",
        cleanLabel: "Cleaner Routine",
        previewBadge: "Live Open-Meteo + Google Gemini",
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
        eyebrow: "Product Features",
        title: "Six focused tools built for everyday families.",
        description:
          "Simple, visual guidance backed by Open-Meteo forecasts, Google Gemini, and transparent impact math.",
        items: [
          {
            title: "Live Air Quality",
            body: "Check real-time modeled US AQI, top pollutants, and a 48-hour forecast for your city.",
            href: "/dashboard",
            tag: "Overview",
          },
          {
            title: "Daily Action Plan",
            body: "Get a time-by-time schedule tailored to daytime air quality and your family's routine.",
            href: "/planner",
            tag: "Daily Plan",
          },
          {
            title: "Home Air Tips",
            body: "Protect your rooms with practical cooking exhaust, sealing, and filtration checklists.",
            href: "/indoor-air",
            tag: "Home Air",
          },
          {
            title: "Green Choices",
            body: "Compare budget-friendly commute and energy swaps that put health protection first.",
            href: "/sustainability",
            tag: "Green Choices",
          },
          {
            title: "My Environmental Impact",
            body: "Measure CO₂e travel savings clearly without mixing climate math with air health risk.",
            href: "/impact",
            tag: "My Impact",
          },
          {
            title: "Community & Reports",
            body: "Create shareable smog plans for schools or societies and print a one-page family brief.",
            href: "/community",
            tag: "Community",
          },
        ],
      },
      howItWorks: {
        eyebrow: "How It Works",
        title: "Three simple steps from air data to daily protection.",
        steps: [
          {
            step: "01",
            title: "Choose your location",
            body: "Search any Indian or global city or detect your area to load live Open-Meteo modeled air quality.",
          },
          {
            step: "02",
            title: "Personalize your lifestyle",
            body: "Set household members, daily commute, and budget locally in your browser with zero login required.",
          },
          {
            step: "03",
            title: "Get AI-powered guidance",
            body: "Receive clear health-first daily plans, indoor air checklists, and emission comparisons powered by Gemini.",
          },
        ],
      },
      trust: {
        eyebrow: "Trust & Transparency",
        title: "Honest data, health safety, and privacy first.",
        description:
          "We clearly separate modeled regional forecasts from ground monitors, label AI vs. rule-based advice, and keep personal choices in your browser.",
        pillars: [
          {
            title: "Open-Meteo Modeled Data",
            body: "Forecasts use Open-Meteo / CAMS atmospheric models and are explicitly distinct from official Indian CPCB NAQI stations.",
          },
          {
            title: "Safe Gemini AI",
            body: "AI answers run server-side with safety overrides that keep indoor health ahead of outdoor exercise during severe smog.",
          },
          {
            title: "Browser-Only Storage",
            body: "Preferences stay in your browser localStorage. Prompts sent to free-tier Gemini follow Google's API data terms.",
          },
        ],
      },
      finalCta: {
        title: "Check your city’s modeled air quality and personalized action plan.",
        body: "Explore live Open-Meteo data, daytime exposure windows, Gemini guidance, and audited CO₂e swaps right now.",
        cta: "Open Air Dashboard",
      },
      footer: {
        attribution:
          "Data & location attribution: Open-Meteo Air Quality API (CAMS), Open-Meteo Geocoding API (GeoNames). AI Engine: Google Gemini.",
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
        { label: "Plan my day", href: "/planner" },
        { label: "Improve home air", href: "/indoor-air" },
        { label: "Find green choices", href: "/sustainability" },
        { label: "Calculate my impact", href: "/impact" },
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
      intelligence: "आज",
      action: "कार्रवाई",
      personalize: "खाता व टूल्स",
    },
    nav: {
      home: "मुख्य पृष्ठ",
      dashboard: "सारांश",
      planner: "दैनिक योजना",
      indoorAir: "घर की हवा",
      sustainability: "हरित विकल्प",
      impact: "मेरा प्रभाव",
      community: "समुदाय",
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
        badge: "शहरी वायु गुणवत्ता सहायक",
        headlineLine1: "समझदारी से सांस लें।",
        headlineLine2: "हरित जीवन जिएं।",
        supportingHeadline:
          "अपनी हवा जानें। परिवार को सुरक्षित रखें। AI के साथ हरित विकल्प चुनें।",
        description:
          "आपके शहर के लिए लाइव वायु गुणवत्ता, व्यावहारिक दैनिक योजना, घर की हवा के उपाय और आसान कार्बन बचत तुलना।",
        primaryCta: "शुरू करें",
        secondaryCta: "विशेषताएँ देखें",
        smogLabel: "घना स्मॉग",
        cleanLabel: "स्वच्छ दिनचर्या",
        previewBadge: "लाइव Open-Meteo + Google Gemini",
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
        eyebrow: "मुख्य सुविधाएँ",
        title: "सामान्य परिवारों के लिए छह सरल उपकरण।",
        description:
          "Open-Meteo पूर्वानुमान, Google Gemini और स्पष्ट प्रभाव गणना पर आधारित आसान मार्गदर्शन।",
        items: [
          {
            title: "लाइव वायु गुणवत्ता",
            body: "अपने शहर का मॉडल्ड US AQI, प्रमुख प्रदूषक और 48-घंटे का पूर्वानुमान देखें।",
            href: "/dashboard",
            tag: "सारांश",
          },
          {
            title: "दैनिक कार्य योजना",
            body: "दिन के व्यावहारिक समय और परिवार की ज़रूरतों के अनुसार समयबद्ध दिनचर्या पाएं।",
            href: "/planner",
            tag: "दैनिक योजना",
          },
          {
            title: "घर की हवा के उपाय",
            body: "खाना पकाने के धुएं, खिड़की सीलिंग और फ़िल्टर के सरल कमरे-वार उपाय अपनाएं।",
            href: "/indoor-air",
            tag: "घर की हवा",
          },
          {
            title: "हरित विकल्प",
            body: "अपने बजट के अनुसार सुरक्षित यात्रा और ऊर्जा के कम-प्रदूषण विकल्प तुलना करें।",
            href: "/sustainability",
            tag: "हरित विकल्प",
          },
          {
            title: "मेरा पर्यावरणीय प्रभाव",
            body: "यात्रा से बचने वाली CO₂e मात्रा को स्वास्थ्य जोखिम से अलग रखकर स्पष्ट मापें।",
            href: "/impact",
            tag: "मेरा प्रभाव",
          },
          {
            title: "समुदाय व रिपोर्ट",
            body: "स्कूलों या सोसायटी के लिए स्मॉग योजना बनाएं और परिवार की एक-पेज रिपोर्ट प्रिंट करें।",
            href: "/community",
            tag: "समुदाय",
          },
        ],
      },
      howItWorks: {
        eyebrow: "कैसे काम करता है",
        title: "वायु डेटा से दैनिक सुरक्षा तक तीन आसान चरण।",
        steps: [
          {
            step: "01",
            title: "अपना स्थान चुनें",
            body: "कोई भी शहर खोजें या अपना क्षेत्र चुनकर लाइव Open-Meteo वायु गुणवत्ता लोड करें।",
          },
          {
            step: "02",
            title: "जीवनशैली सेट करें",
            body: "बिना लॉगिन अपने ब्राउज़र में परिवार के सदस्य, यात्रा माध्यम और बजट चुनें।",
          },
          {
            step: "03",
            title: "AI मार्गदर्शन पाएं",
            body: "Gemini और स्वास्थ्य-सुरक्षा नियमों से दैनिक योजना, इनडोर उपाय और प्रभाव तुलना पाएं।",
          },
        ],
      },
      trust: {
        eyebrow: "विश्वास व पारदर्शिता",
        title: "ईमानदार डेटा, स्वास्थ्य सुरक्षा और गोपनीयता।",
        description:
          "हम मॉडल्ड क्षेत्रीय पूर्वानुमान को ग्राउंड स्टेशनों से अलग दिखाते हैं और AI बनाम नियम-आधारित सलाह स्पष्ट करते हैं।",
        pillars: [
          {
            title: "Open-Meteo मॉडल्ड डेटा",
            body: "पूर्वानुमान Open-Meteo / CAMS मॉडल पर आधारित हैं और भारतीय CPCB NAQI ग्राउंड स्टेशनों से भिन्न हैं।",
          },
          {
            title: "सुरक्षित Gemini AI",
            body: "AI उत्तर सर्वर पर सुरक्षा नियमों के साथ चलते हैं ताकि गंभीर स्मॉग में स्वास्थ्य सुरक्षा प्राथमिकता रहे।",
          },
          {
            title: "स्थानीय ब्राउज़र स्टोरेज",
            body: "प्राथमिकताएँ आपके ब्राउज़र में रहती हैं; मुफ्त-टियर Gemini अनुरोध Google की API शर्तों के अधीन हैं।",
          },
        ],
      },
      finalCta: {
        title: "अपने शहर की मॉडल्ड वायु गुणवत्ता और व्यक्तिगत सुरक्षा योजना देखें।",
        body: "लाइव Open-Meteo डेटा, दिन की व्यावहारिक अवधि, Gemini AI मार्गदर्शन और CO₂e तुलना अभी जांचें।",
        cta: "वायु डैशबोर्ड खोलें",
      },
      footer: {
        attribution:
          "डेटा व स्थान श्रेय: Open-Meteo Air Quality API (CAMS), Open-Meteo Geocoding API (GeoNames)। AI इंजन: Google Gemini।",
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
        { label: "आज की योजना बनाएं", href: "/planner" },
        { label: "घर की हवा सुधारें", href: "/indoor-air" },
        { label: "हरित विकल्प खोजें", href: "/sustainability" },
        { label: "मेरा प्रभाव मापें", href: "/impact" },
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
