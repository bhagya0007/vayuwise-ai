import type {
  ActivityType,
  BudgetTier,
  CommuteMode,
  CookingPractice,
  LifestyleCategory,
  Locale,
  SustainabilityGoal,
  WorkScheduleMode,
} from "@/types/domain";

export interface Phase04Dictionary {
  profileTypes: Record<LifestyleCategory, { label: string; desc: string }>;
  workSchedules: Record<WorkScheduleMode, string>;
  cookingPractices: Record<CookingPractice, string>;
  commuteModes: Record<CommuteMode, string>;
  budgetLabels: Record<BudgetTier, string>;
  sustainabilityGoals: Record<SustainabilityGoal, string>;
  activityTypes: Record<ActivityType, string>;
  onboarding: {
    badge: string;
    title: string;
    subtitle: string;
    stepOf: string;
    back: string;
    next: string;
    skipAll: string;
    finish: string;
    steps: readonly { title: string; subtitle: string }[];
    privacyNote: string;
  };
  profile: {
    title: string;
    subtitle: string;
    launchOnboarding: string;
    deleteAllBtn: string;
    deleteConfirmToast: string;
    sensitivityOptInTitle: string;
    sensitivityOptInDesc: string;
    activePrefsTitle: string;
    scheduleLabel: string;
    commuteDurationLabel: string;
    travelDaysLabel: string;
    workingWeeksLabel: string;
    occupancyLabel: string;
    cookingLabel: string;
    goalsLabel: string;
  };
  impact: {
    badge: string;
    title: string;
    subtitle: string;
    heroAvoidedLabel: string;
    heroIncreaseLabel: string;
    heroZeroLabel: string;
    estimationNotice: string;
    scenarioPresetsTitle: string;
    baselineHeading: string;
    alternativeHeading: string;
    whatIfTitle: string;
    distanceLabel: string;
    daysLabel: string;
    weeksLabel: string;
    occupancyLabel: string;
    baselineModeLabel: string;
    altModeLabel: string;
    dailyLabel: string;
    weeklyLabel: string;
    monthlyLabel: string;
    annualLabel: string;
    explainBtn: string;
    explainTitle: string;
    methodologyTitle: string;
    exposureTitle: string;
    exposureSubtitle: string;
    exposureDisclaimer: string;
    baselineHourLabel: string;
    altHourLabel: string;
    durationLabel: string;
    trackerTitle: string;
    trackerSubtitle: string;
    logActionBtn: string;
    clearAllBtn: string;
    achievedSavingsNote: string;
  };
  staleNotice: {
    title: string;
    body: string;
    tailoredFor: string;
  };
}

export const PHASE04_DICTIONARY: Record<Locale, Phase04Dictionary> = {
  en: {
    profileTypes: {
      individual: { label: "Individual", desc: "Single-person urban routine & solo commute" },
      student: { label: "Student", desc: "College/school commute & budget-first actions" },
      working_professional: { label: "Working Professional", desc: "Office, hybrid, or WFH daily schedule" },
      family_household: { label: "Family Household", desc: "Multi-member home with shared indoor air" },
      senior_citizen: { label: "Senior Household", desc: "Extra respiratory margin & gentle routines" },
      community_representative: { label: "Community Rep", desc: "Society, campus, or neighborhood coordination" },
      outdoor_fitness: { label: "Outdoor Fitness", desc: "Active exercise timed around lower PM2.5" },
    },
    workSchedules: {
      onsite: "On-site Daily (Fixed Travel)",
      hybrid: "Hybrid (Mixed Office & Home)",
      remote: "Remote Work / Online Study",
      student_schedule: "School / College Timetable",
      flexible: "Flexible / Mixed Errands",
    },
    cookingPractices: {
      lpg_gas: "LPG / Piped Gas Stove",
      electric_induction: "Electric / Induction Cooktop",
      mixed: "Mixed Gas & Electric",
      solid_fuel_nearby: "Solid Fuel / Nearby Biomass Smoke",
    },
    commuteModes: {
      car_petrol: "Petrol Car",
      car_diesel: "Diesel Car",
      car_cng: "CNG Car",
      car_electric: "Electric Car (Grid-charged)",
      two_wheeler: "Petrol Two-Wheeler",
      two_wheeler_electric: "Electric Two-Wheeler",
      carpool: "Shared Carpool",
      bus: "Public Intracity Bus",
      metro_rail: "Metro / Urban Rail",
      walk: "Walking",
      cycle: "Cycling",
      work_from_home: "Remote Work / Study",
      walk_cycle: "Walk / Cycle",
    },
    budgetLabels: {
      free: "Zero-Cost Actions Only",
      low_cost: "Low-Cost Practical Swaps",
      investment: "Equipment / Upgrade Ready",
    },
    sustainabilityGoals: {
      reduce_commute_emissions: "Lower Commute CO2e",
      cleaner_indoor_air: "Cleaner Indoor Air",
      low_cost_swaps: "Zero/Low-Cost Daily Swaps",
      protect_vulnerable_members: "Protect Children & Seniors",
      community_action: "Neighborhood & Society Action",
    },
    activityTypes: {
      used_public_transport: "Used Public Transit",
      carpooled: "Shared Carpool",
      avoided_travel: "Avoided / Remote Travel",
      indoor_air_action: "Indoor Air Action",
      daily_planner_action: "Planner Slot Completed",
      community_action: "Community Smog Action",
    },
    onboarding: {
      badge: "Optional 6-Step Guided Setup",
      title: "Personalize VayuWise AI to Your Routine",
      subtitle: "No names, medical records, or exact addresses required. You can skip at any time or edit later in Profile.",
      stepOf: "Step {current} of {total}",
      back: "Back",
      next: "Continue",
      skipAll: "Skip to Dashboard",
      finish: "Save & Launch Workspace",
      steps: [
        { title: "Choose Your City", subtitle: "Select the urban airshed you navigate daily." },
        { title: "Household Profile", subtitle: "Pick the household type and age composition." },
        { title: "Daily Schedule", subtitle: "Align tips to on-site, hybrid, student, or indoor routines." },
        { title: "Commute Setup", subtitle: "Set current travel mode, distance, frequency, and occupancy." },
        { title: "Indoor Environment", subtitle: "Tell us about HEPA filtration, cross-ventilation, and cooking fuel." },
        { title: "Goals & Privacy Review", subtitle: "Select sustainability priorities and confirm local-only storage." },
      ],
      privacyNote: "Saved strictly in browser localStorage. Optional sensitivity priority requires explicit opt-in.",
    },
    profile: {
      title: "Family & Lifestyle Profile",
      subtitle: "Configure non-sensitive preferences used across AI modules and deterministic impact calculations.",
      launchOnboarding: "Guided Onboarding",
      deleteAllBtn: "Delete All Local Data",
      deleteConfirmToast: "All local profile, onboarding, and activity logs deleted.",
      sensitivityOptInTitle: "Opt-in Respiratory Protection Priority",
      sensitivityOptInDesc: "Optional preference only (not persisted unless enabled; no medical records stored).",
      activePrefsTitle: "Active Personalization Context",
      scheduleLabel: "Work / Study Schedule",
      commuteDurationLabel: "One-Way Commute Duration (min)",
      travelDaysLabel: "Travel Days / Week",
      workingWeeksLabel: "Active Weeks / Year",
      occupancyLabel: "Vehicle Occupancy (People)",
      cookingLabel: "Primary Cooking Practice",
      goalsLabel: "Sustainability & Protection Goals",
    },
    impact: {
      badge: "Verified Emission Factor Engine · Audited Reference Data",
      title: "Environmental Impact & Exposure Lab",
      subtitle: "Transparent transport CO2e math strictly separated from hourly ambient PM2.5 concentration-time indicators.",
      heroAvoidedLabel: "Estimated Operational CO2e Avoided",
      heroIncreaseLabel: "Estimated Operational CO2e Increase",
      heroZeroLabel: "Equal Operational Emissions",
      estimationNotice: "Modeled operational estimate (not measured AQI or health-risk reduction)",
      scenarioPresetsTitle: "Quick What-If Presets",
      baselineHeading: "Baseline Scenario",
      alternativeHeading: "Alternative Scenario",
      whatIfTitle: "Commute & Schedule What-If Simulator",
      distanceLabel: "Round-Trip Distance (km / day)",
      daysLabel: "Travel Days / Week",
      weeksLabel: "Working Weeks / Year",
      occupancyLabel: "Occupancy (People in Car)",
      baselineModeLabel: "Baseline Mode",
      altModeLabel: "Alternative Mode",
      dailyLabel: "Daily",
      weeklyLabel: "Weekly",
      monthlyLabel: "Monthly Avg",
      annualLabel: "Annual Projection",
      explainBtn: "What does this impact mean?",
      explainTitle: "What Does This Impact Mean? (Gemini AI Explanation)",
      methodologyTitle: "Cited Emission Factors & Calculation Boundaries",
      exposureTitle: "Outdoor Ambient Concentration-Time Comparison",
      exposureSubtitle: "Separate PM2.5 × Duration indicator (µg·h/m³) using Open-Meteo hourly concentrations.",
      exposureDisclaimer: "Simplified ambient concentration-time indicator only — NOT measured inhaled dose or disease risk.",
      baselineHourLabel: "Baseline Hour Slot",
      altHourLabel: "Alternative Hour Slot",
      durationLabel: "Outdoor Duration (hours)",
      trackerTitle: "Green Activity Progress Tracker",
      trackerSubtitle: "Log real completed actions locally without duplicate counting or fabricated achievements.",
      logActionBtn: "Log Completed Action",
      clearAllBtn: "Clear History",
      achievedSavingsNote: "Achieved savings reflect only logged completed trips, never hypothetical projections.",
    },
    staleNotice: {
      title: "Profile or Location Changed",
      body: "Your active city or preferences changed since this response was generated. Regenerate to align with your current profile.",
      tailoredFor: "Tailored using",
    },
  },
  hi: {
    profileTypes: {
      individual: { label: "व्यक्तिगत", desc: "एकल शहरी दिनचर्या और यात्रा" },
      student: { label: "छात्र", desc: "स्कूल/कॉलेज यात्रा और कम खर्च वाले उपाय" },
      working_professional: { label: "कामकाजी पेशेवर", desc: "ऑफ़िस, हाइब्रिड या रिमोट कार्य शेड्यूल" },
      family_household: { label: "परिवार", desc: "बच्चों व वरिष्ठों सहित साझा घरेलू हवा" },
      senior_citizen: { label: "वरिष्ठ नागरिक परिवार", desc: "अतिरिक्त श्वसन सुरक्षा प्राथमिकता" },
      community_representative: { label: "सामुदायिक प्रतिनिधि", desc: "सोसायटी, कैंपस या मोहल्ला समन्वय" },
      outdoor_fitness: { label: "आउटडोर फ़िटनेस", desc: "कम PM2.5 समय के अनुसार व्यायाम" },
    },
    workSchedules: {
      onsite: "नियमित ऑफ़िस / साइट यात्रा",
      hybrid: "हाइब्रिड (ऑफ़िस + घर)",
      remote: "रिमोट कार्य / ऑनलाइन अध्ययन",
      student_schedule: "स्कूल / कॉलेज समय-सारिणी",
      flexible: "लचीला / मिश्रित समय",
    },
    cookingPractices: {
      lpg_gas: "एलपीजी / पाइप्ड गैस स्टोव",
      electric_induction: "इलेक्ट्रिक / इंडक्शन कुकटॉप",
      mixed: "मिश्रित गैस और इंडक्शन",
      solid_fuel_nearby: "ठोस ईंधन / आस-पास बायोमास धुआं",
    },
    commuteModes: {
      car_petrol: "पेट्रोल कार",
      car_diesel: "डीज़ल कार",
      car_cng: "सीएनजी कार",
      car_electric: "इलेक्ट्रिक कार (ग्रिड चार्ज)",
      two_wheeler: "पेट्रोल दोपहिया वाहन",
      two_wheeler_electric: "इलेक्ट्रिक दोपहिया वाहन",
      carpool: "साझा कारपूल",
      bus: "सार्वजनिक सिटी बस",
      metro_rail: "मेट्रो / शहरी रेल",
      walk: "पैदल चलना",
      cycle: "साइकिल चलाना",
      work_from_home: "वर्क फ्रॉम होम / ऑनलाइन अध्ययन",
      walk_cycle: "पैदल / साइकिल",
    },
    budgetLabels: {
      free: "केवल शून्य-खर्च उपाय",
      low_cost: "कम खर्च वाले व्यावहारिक बदलाव",
      investment: "उपकरण / अपग्रेड सक्षम",
    },
    sustainabilityGoals: {
      reduce_commute_emissions: "यात्रा CO2e कम करना",
      cleaner_indoor_air: "स्वच्छ इनडोर हवा",
      low_cost_swaps: "कम-खर्च दैनिक आदतें",
      protect_vulnerable_members: "बच्चों व बुजुर्गों की सुरक्षा",
      community_action: "सामुदायिक स्मॉग कार्रवाई",
    },
    activityTypes: {
      used_public_transport: "सार्वजनिक परिवहन उपयोग",
      carpooled: "साझा कारपूल किया",
      avoided_travel: "यात्रा टाली / रिमोट कार्य",
      indoor_air_action: "इनडोर वायु सुरक्षा कार्य",
      daily_planner_action: "दैनिक योजना कार्य पूर्ण",
      community_action: "सामुदायिक कार्य",
    },
    onboarding: {
      badge: "वैकल्पिक 6-चरणीय मार्गदर्शित सेटअप",
      title: "अपनी दिनचर्या के अनुसार VayuWise AI सेट करें",
      subtitle: "नाम, मेडिकल रिकॉर्ड या सटीक पते की आवश्यकता नहीं है। आप कभी भी स्किप कर सकते हैं।",
      stepOf: "चरण {current} / {total}",
      back: "पिछला",
      next: "आगे बढ़ें",
      skipAll: "डैशबोर्ड पर जाएं",
      finish: "सहेजें और शुरू करें",
      steps: [
        { title: "अपना शहर चुनें", subtitle: "वह शहरी क्षेत्र चुनें जहाँ आप दैनिक यात्रा करते हैं।" },
        { title: "परिवार की संरचना", subtitle: "प्रोफ़ाइल प्रकार और आयु वर्ग चुनें।" },
        { title: "दैनिक कार्य शेड्यूल", subtitle: "ऑफ़िस, हाइब्रिड, छात्र या घर से कार्य सेट करें।" },
        { title: "यात्रा प्राथमिकताएँ", subtitle: "यात्रा माध्यम, दूरी, दिन और सह-यात्री संख्या चुनें।" },
        { title: "इनडोर वातावरण", subtitle: "HEPA फ़िल्टर, वेंटिलेशन और रसोई ईंधन बताएं।" },
        { title: "लक्ष्य और गोपनीयता", subtitle: "प्राथमिकताएँ चुनें और ब्राउज़र-आधारित स्टोरेज की पुष्टि करें।" },
      ],
      privacyNote: "डेटा केवल आपके ब्राउज़र localStorage में रहता है। संवेदनशीलता प्राथमिकता पूर्णतः वैकल्पिक है।",
    },
    profile: {
      title: "परिवार एवं जीवनशैली प्रोफ़ाइल",
      subtitle: "AI मॉड्यूल और नियतात्मक गणना के लिए गैर-संवेदनशील प्राथमिकताएँ सेट करें।",
      launchOnboarding: "मार्गदर्शित सेटअप",
      deleteAllBtn: "सारा स्थानीय डेटा हटाएं",
      deleteConfirmToast: "सभी स्थानीय प्रोफ़ाइल, ऑनबोर्डिंग और गतिविधि रिकॉर्ड हटा दिए गए।",
      sensitivityOptInTitle: "वैकल्पिक श्वसन सुरक्षा प्राथमिकता (Opt-in)",
      sensitivityOptInDesc: "पूर्णतः वैकल्पिक प्राथमिकता; कोई मेडिकल रिकॉर्ड संग्रहीत नहीं होता।",
      activePrefsTitle: "सक्रिय वैयक्तिकरण संदर्भ",
      scheduleLabel: "कार्य / अध्ययन शेड्यूल",
      commuteDurationLabel: "एक-तरफा यात्रा समय (मिनट)",
      travelDaysLabel: "सप्ताह में यात्रा दिन",
      workingWeeksLabel: "वर्ष में सक्रिय सप्ताह",
      occupancyLabel: "वाहन में यात्री संख्या",
      cookingLabel: "रसोई ईंधन प्रकार",
      goalsLabel: "स्थिरता और सुरक्षा लक्ष्य",
    },
    impact: {
      badge: "सत्यापित उत्सर्जन कारक इंजन · ऑडिट संदर्भ डेटा",
      title: "पर्यावरणीय प्रभाव एवं एक्सपोज़र लैब",
      subtitle: "वैज्ञानिक CO2e गणना और प्रति घंटा परिवेश PM2.5 सांद्रता-समय संकेतक की अलग-अलग पारदर्शी तुलना।",
      heroAvoidedLabel: "अनुमानित परिचालन CO2e बचत",
      heroIncreaseLabel: "अनुमानित परिचालन CO2e वृद्धि",
      heroZeroLabel: "समान परिचालन उत्सर्जन",
      estimationNotice: "मॉडल्ड परिचालन अनुमान (मापा गया AQI या स्वास्थ्य जोखिम नहीं)",
      scenarioPresetsTitle: "त्वरित व्हाट-इफ प्रीसेट",
      baselineHeading: "वर्तमान परिदृश्य (Baseline)",
      alternativeHeading: "वैकल्पिक परिदृश्य",
      whatIfTitle: "यात्रा और शेड्यूल व्हाट-इफ सिम्युलेटर",
      distanceLabel: "दैनिक कुल दूरी (किमी / दिन)",
      daysLabel: "सप्ताह में यात्रा दिन",
      weeksLabel: "वर्ष में कार्य सप्ताह",
      occupancyLabel: "सह-यात्री संख्या (कार में)",
      baselineModeLabel: "वर्तमान साधन",
      altModeLabel: "वैकल्पिक साधन",
      dailyLabel: "दैनिक",
      weeklyLabel: "साप्ताहिक",
      monthlyLabel: "मासिक औसत",
      annualLabel: "वार्षिक अनुमान",
      explainBtn: "इस प्रभाव का क्या अर्थ है?",
      explainTitle: "इस प्रभाव का व्यावहारिक अर्थ (Gemini AI व्याख्या)",
      methodologyTitle: "संदर्भित उत्सर्जन कारक और गणना सीमाएँ",
      exposureTitle: "बाहरी परिवेश सांद्रता-समय तुलना",
      exposureSubtitle: "Open-Meteo प्रति घंटा डेटा से PM2.5 × अवधि संकेतक (µg·h/m³)।",
      exposureDisclaimer: "यह केवल सरलीकृत बाहरी सांद्रता-समय संकेतक है — मापी गई श्वसन खुराक या रोग जोखिम नहीं।",
      baselineHourLabel: "बेसलाइन घंटा स्लॉट",
      altHourLabel: "वैकल्पिक घंटा स्लॉट",
      durationLabel: "बाहरी अवधि (घंटे)",
      trackerTitle: "हरित गतिविधि प्रगति ट्रैकर",
      trackerSubtitle: "दोहरी गिनती के बिना वास्तविक पूर्ण की गई गतिविधियाँ स्थानीय रूप से दर्ज करें।",
      logActionBtn: "पूर्ण गतिविधि दर्ज करें",
      clearAllBtn: "इतिहास हटाएं",
      achievedSavingsNote: "अर्जित बचत केवल दर्ज की गई वास्तविक यात्राओं पर आधारित है।",
    },
    staleNotice: {
      title: "प्रोफ़ाइल या स्थान बदला गया",
      body: "यह सुझाव बनने के बाद आपका शहर या प्राथमिकताएँ बदली हैं। अद्यतन सुझावों के लिए रीफ़्रेश करें।",
      tailoredFor: "इन प्राथमिकताओं पर आधारित",
    },
  },
};
