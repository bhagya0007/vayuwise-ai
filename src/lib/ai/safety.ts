import { resolveVerifiedCitations } from "@/lib/ai/knowledge-registry";
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

export interface SafetyValidationReport {
  passed: boolean;
  violations: string[];
  conservativeOverrideApplied: boolean;
  emergencyCareAdvisoryAdded: boolean;
  fullReplacement?: boolean;
  adjustedParts?: string[];
}

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*?>/gi;

export function sanitizeModelText(input: string): string {
  let sanitized = input.replace(HTML_TAG_REGEX, "");
  const configuredKey =
    typeof process !== "undefined" ? process.env.GEMINI_API_KEY?.trim() : undefined;
  if (configuredKey && configuredKey.length >= 8) {
    sanitized = sanitized.split(configuredKey).join("[REDACTED]");
  }
  return sanitized
    .replace(/AIza[0-9A-Za-z_-]{15,}/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(x-goog-api-key["':\s=]+)[A-Za-z0-9._-]{8,}/gi, "$1[REDACTED]")
    .trim();
}

export function sanitizeDeepStrings<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeModelText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeepStrings(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeepStrings(v);
    }
    return out as T;
  }
  return value;
}

const MEDICAL_DIAGNOSIS_PATTERNS = [
  /\byou (?:likely |definitely )?have (?:asthma|copd|bronchitis|pneumonia|heart disease)\b/i,
  /\bprescribe\b/i,
  /\btake (?:antibiotics|steroids|inhaler dose)\b/i,
  /\bcure[sd]? (?:asthma|copd|respiratory disease)\b/i,
] as const;

const UNSAFE_INDOOR_PATTERNS = [
  /\bozone[- ]generat(?:ing|or)\b/i,
  /\bburn(?:ing)? incense to (?:purify|clean)\b/i,
  /\bhouseplants? (?:alone )?(?:replace|substitute|clean all) (?:hepa|filtration|pm2\.?5)\b/i,
  /\bexhaust fan(?:s)? (?:alone )?(?:guarantee|make|ensure)(?:s)? (?:clean(?:er)?|safe) indoor air\b/i,
  /\bopen windows? (?:all night|at midnight|around 00:30|overnight for clean air)\b/i,
] as const;

const GUARANTEED_SAFE_PATTERNS = [
  /\b(?:100%|completely|totally|guaranteed) safe\b/i,
  /\bzero risk\b/i,
] as const;

const UNSAFE_OUTDOOR_EXERCISE_PATTERNS = [
  /\b(?:go for a run|jog outdoors?|outdoor (?:running|jogging|hiit|sprint)|cycle to work|walk outdoors for exercise)\b/i,
] as const;

const UNSUPPORTED_NUMERIC_CLAIMS_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:kg|tons?|tonnes?) of co2e?\b/i,
  /\breduces? (?:pm2\.?5|pollution|exposure|aqi) by \d+%/i,
  /\bcuts? emissions by \d+%/i,
] as const;

const EMERGENCY_SYMPTOM_PATTERNS = [
  /\bchest pain\b/i,
  /\bshortness of breath\b/i,
  /\bdifficulty breathing\b/i,
  /\bsevere wheezing\b/i,
  /सांस फूलना/i,
  /सीने में दर्द/i,
] as const;

export function hasEmergencySymptoms(userText: string): boolean {
  return EMERGENCY_SYMPTOM_PATTERNS.some((re) => re.test(userText));
}

export function scanTextForSafetyViolations(
  text: string,
  options: {
    healthProtectionPriority: boolean;
    forbidNumericCo2e?: boolean;
    allowedGroundedNumbers?: number[];
  }
): string[] {
  const violations: string[] = [];

  if (MEDICAL_DIAGNOSIS_PATTERNS.some((re) => re.test(text))) {
    violations.push("medical_diagnosis_or_treatment_claim");
  }
  if (UNSAFE_INDOOR_PATTERNS.some((re) => re.test(text))) {
    violations.push("unsafe_indoor_air_claim");
  }
  if (GUARANTEED_SAFE_PATTERNS.some((re) => re.test(text))) {
    violations.push("guaranteed_safe_air_claim");
  }
  if (
    options.healthProtectionPriority &&
    UNSAFE_OUTDOOR_EXERCISE_PATTERNS.some((re) => re.test(text))
  ) {
    violations.push("unsafe_outdoor_exertion_during_high_aqi");
  }
  if (options.forbidNumericCo2e !== false) {
    if (options.allowedGroundedNumbers && options.allowedGroundedNumbers.length > 0) {
      const allowed = options.allowedGroundedNumbers;
      const isGrounded = (num: number) =>
        allowed.some(
          (ref) =>
            Math.abs(Math.abs(num) - Math.abs(ref)) <=
            Math.max(0.2, Math.abs(ref) * 0.015)
        );
      const co2Matches = Array.from(
        text.matchAll(/(\d+(?:\.\d+)?)\s*(?:kg|tons?|tonnes?)\s*(?:of\s*)?co2e?/gi)
      );
      const pctMatches = Array.from(
        text.matchAll(
          /(?:reduction|cut|save[sd]?|avoid(?:ed)?|increase)[^.%\n]{0,30}?(\d+(?:\.\d+)?)%/gi
        )
      );
      const hasUngroundedCo2 = co2Matches.some((m) => !isGrounded(Number(m[1])));
      const hasUngroundedPct = pctMatches.some((m) => !isGrounded(Number(m[1])));
      const hasUnsupportedHealthPct =
        /\breduces?\s+(?:pm2\.?5|pollution|exposure|aqi|asthma|mortality|risk)\s+by\s+\d+(?:\.\d+)?%/i.test(
          text
        );

      if (hasUngroundedCo2 || hasUngroundedPct || hasUnsupportedHealthPct) {
        violations.push("unsupported_or_modified_calculated_value");
      }
    } else if (UNSUPPORTED_NUMERIC_CLAIMS_PATTERNS.some((re) => re.test(text))) {
      violations.push("unsupported_numeric_impact_or_reduction_claim");
    }
  }

  return Array.from(new Set(violations));
}

function normalizeSourceIdArray(ids: readonly string[] | undefined): string[] {
  return resolveVerifiedCitations(ids).map((s) => s.id);
}

export function getEmergencyDisclaimer(locale: Locale): string {
  return locale === "hi"
    ? "यदि सांस फूलने, सीने में दर्द या गंभीर लक्षण महसूस हों, तो तुरंत चिकित्सकीय या आपातकालीन सहायता लें।"
    : "If experiencing shortness of breath, chest pain, or worsening symptoms, seek prompt medical or emergency care.";
}

type ChatIntent = "indoor_air" | "commute" | "exercise" | "community" | "general";

function detectUserIntent(userMessage: string): ChatIntent {
  const lower = userMessage.toLowerCase();
  if (
    /(indoor|room|kitchen|cook|ventilation|window|purifier|hepa|incense|fan|घर के भीतर|इनडोर|रसोई|खिड़की)/i.test(
      lower
    )
  ) {
    return "indoor_air";
  }
  if (
    /(commute|travel|metro|bus|car|drive|bike|scooter|आवागमन|यात्रा|मेट्रो)/i.test(
      lower
    )
  ) {
    return "commute";
  }
  if (/(exercise|run|jog|walk|workout|play|sport|व्यायाम|टहल|दौड़)/i.test(lower)) {
    return "exercise";
  }
  if (/(community|society|rwa|school|neighborhood|समुदाय|सोसायटी|स्कूल)/i.test(lower)) {
    return "community";
  }
  return "general";
}

function buildIntentAwareReplacementReply(
  intent: ChatIntent,
  ctx: GeminiAirQualityContext,
  locale: Locale
): string {
  const aqiText =
    ctx.current.usAqi !== null
      ? `US AQI ${Math.round(ctx.current.usAqi)} (${ctx.current.severityLabel})`
      : "current modeled conditions";

  if (intent === "indoor_air") {
    return locale === "hi"
      ? `${ctx.location.name} (${aqiText}) के लिए सुरक्षित इनडोर वायु मार्गदर्शन: खाना पकाते समय ही किचन एग्जॉस्ट चलाएं और बाद में बंद कर दें (बाहरी स्मॉग में साधारण एग्जॉस्ट बाहर की प्रदूषित हवा अंदर खींच सकता है)। दरवाजे-खिड़कियों की दरारें सील रखें, गीला पोंछा लगाएं, अगरबत्ती/धूप से बचें, और उपलब्ध होने पर HEPA फ़िल्ट्रेशन उपयोग करें (ओज़ोन प्यूरीफ़ायर या केवल पौधों पर निर्भर न रहें)।`
      : `Conservative safety override (indoor air guidance for ${ctx.location.name}, ${aqiText}): Indoor air is unmeasured by exterior satellites; keep windows/door drafts sealed during unhealthy peaks, run kitchen range exhaust strictly while cooking to vent stove smoke/NO2 (then turn off so outdoor smog is not drawn in), damp-mop instead of sweeping, avoid indoor incense/candles, and rely on mechanical HEPA filtration rather than ozone devices or houseplants alone.`;
  }
  if (intent === "commute") {
    return locale === "hi"
      ? `${ctx.location.name} (${aqiText}) के लिए सुरक्षित यात्रा मार्गदर्शन: खुली हवा में पैदल या साइकिल चलाने के बजाय बंद मेट्रो, एसी बस या संभव हो तो रिमोट कार्य चुनें, और आवश्यक बाहर जाने पर अच्छी फिट वाला N95/FFP2 मास्क पहनें।`
      : `Conservative safety override (commute guidance for ${ctx.location.name}, ${aqiText}): During elevated pollution, prioritize enclosed metro, AC transit, or remote work over open-road walking/cycling, and wear a snug N95/FFP2 respirator for essential outdoor segments.`;
  }
  if (intent === "exercise") {
    return locale === "hi"
      ? `${ctx.location.name} (${aqiText}) के लिए व्यायाम सुरक्षा: इस स्तर पर बाहरी दौड़ या तेज़ व्यायाम टालें और घर के अंदर स्ट्रेचिंग, योग या कम-प्रभाव व्यायाम करें।`
      : `Conservative safety override (exercise guidance for ${ctx.location.name}, ${aqiText}): Postpone outdoor running or intense cardio under current conditions and shift workouts indoors (mobility, yoga, or low-impact home training).`;
  }
  if (intent === "community") {
    return locale === "hi"
      ? `${ctx.location.name} (${aqiText}) के लिए सामुदायिक सुरक्षा: परिसर में पत्तियों या कचरे को जलाना पूरी तरह रोकें, बाहरी कर्मचारियों को N95/FFP2 मास्क दें, और बच्चों/वरिष्ठों के लिए इनडोर स्वच्छ-वायु कक्ष की व्यवस्था करें।`
      : `Conservative safety override (community guidance for ${ctx.location.name}, ${aqiText}): Enforce zero open leaf or trash burning, move group sports indoors, and provide snug N95/FFP2 protection and indoor rest rotations for outdoor staff.`;
  }
  return locale === "hi"
    ? `सुरक्षा सत्यापन लागू (${ctx.location.name}, ${aqiText}): ${ctx.deterministicGuidance.headline}। ${ctx.deterministicGuidance.recommendedPrimaryAction}`
    : `Conservative safety override applied for ${ctx.location.name} (${aqiText}): ${ctx.deterministicGuidance.headline}. ${ctx.deterministicGuidance.recommendedPrimaryAction}`;
}

export function applyChatSafetyPolicy(
  raw: AiChatResponse,
  ctx: GeminiAirQualityContext,
  userMessage: string,
  locale: Locale
): { data: AiChatResponse; report: SafetyValidationReport } {
  const sanitized = sanitizeDeepStrings(raw);
  const healthPriority = ctx.deterministicGuidance.healthProtectionPriority;
  const emergency = hasEmergencySymptoms(userMessage);
  const intent = detectUserIntent(userMessage);

  // Scan main reply independently from structured cards so safe model answers aren't wiped by one bad card
  const replyViolations = scanTextForSafetyViolations(sanitized.reply, {
    healthProtectionPriority: healthPriority,
  });

  const allViolations = new Set<string>(replyViolations);
  const adjustedParts: string[] = [];

  let reply = sanitized.reply;
  let fullReplacement = false;
  let conservativeOverrideApplied = false;

  if (replyViolations.length > 0) {
    conservativeOverrideApplied = true;
    fullReplacement = true;
    adjustedParts.push("reply");
    reply = buildIntentAwareReplacementReply(intent, ctx, locale);
  }

  const cautions = sanitized.cautions.filter((c) => {
    const cv = scanTextForSafetyViolations(c, {
      healthProtectionPriority: healthPriority,
    });
    if (cv.length > 0) {
      cv.forEach((v) => allViolations.add(v));
      conservativeOverrideApplied = true;
      adjustedParts.push("cautions");
      return false;
    }
    return true;
  });

  if (emergency) {
    adjustedParts.push("emergency_care_advisory");
    cautions.unshift(getEmergencyDisclaimer(locale));
  }

  const safeRecs = sanitized.recommendations.map((rec) => {
    const rv = scanTextForSafetyViolations(
      `${rec.title} ${rec.suggestedAction} ${rec.expectedQualitativeBenefit}`,
      { healthProtectionPriority: healthPriority }
    );
    if (rv.length === 0) {
      return {
        ...rec,
        sourceIds: normalizeSourceIdArray(rec.sourceIds),
      };
    }

    rv.forEach((v) => allViolations.add(v));
    conservativeOverrideApplied = true;
    adjustedParts.push("recommendations");

    if (intent === "indoor_air") {
      return {
        ...rec,
        title:
          locale === "hi"
            ? "स्रोत नियंत्रण व यांत्रिक फ़िल्ट्रेशन"
            : "Indoor Source Control & Filtration",
        suggestedAction:
          locale === "hi"
            ? "खाना पकाते समय ही किचन एग्जॉस्ट चलाएं, खिड़कियां बंद रखें और HEPA फ़िल्ट्रेशन या गीला पोंछा अपनाएं।"
            : "Run kitchen exhaust strictly while cooking, keep exterior leaks sealed during peak smog, and rely on damp-mopping or HEPA filtration (no ozone).",
        expectedQualitativeBenefit:
          locale === "hi"
            ? "इनडोर PM2.5 वृद्धि को रोकने और बाहरी स्मॉग प्रवेश कम करने में सहायक।"
            : "Helps curb indoor particle spikes without relying on outdoor dilution during polluted hours.",
        sourceIds: ["US_EPA_INDOOR"],
      };
    }

    return {
      ...rec,
      suggestedAction: ctx.deterministicGuidance.recommendedPrimaryAction,
      expectedQualitativeBenefit:
        locale === "hi"
          ? "उच्च प्रदूषण अवधि में श्वसन संपर्क कम करने में सहायक।"
          : "Helps reduce acute particulate inhalation during elevated smog.",
      sourceIds: ["WHO_AQG_2021", "US_EPA_AQI"],
    };
  });

  return {
    data: {
      ...sanitized,
      reply,
      cautions: Array.from(new Set(cautions)).slice(0, 4),
      recommendations: safeRecs,
      sourceIds: normalizeSourceIdArray(sanitized.sourceIds),
      disclaimer: emergency
        ? getEmergencyDisclaimer(locale)
        : sanitized.disclaimer,
    },
    report: {
      passed: allViolations.size === 0,
      violations: Array.from(allViolations),
      conservativeOverrideApplied,
      emergencyCareAdvisoryAdded: emergency,
      fullReplacement,
      adjustedParts: Array.from(new Set(adjustedParts)),
    },
  };
}

export function applyDailyPlanSafetyPolicy(
  raw: AiDailyPlanResponse,
  ctx: GeminiAirQualityContext,
  locale: Locale
): { data: AiDailyPlanResponse; report: SafetyValidationReport } {
  const sanitized = sanitizeDeepStrings(raw);
  const healthPriority = ctx.deterministicGuidance.healthProtectionPriority;
  const allViolations = new Set<string>();
  let overrideApplied = false;

  const safeSlots = sanitized.slots.map((slot) => {
    const slotText = `${slot.whatToDo} ${slot.expectedBenefit} ${slot.alternativeAction}`;
    const v = scanTextForSafetyViolations(slotText, {
      healthProtectionPriority: healthPriority,
    });
    if (v.length === 0) {
      return {
        ...slot,
        healthPriority: healthPriority || slot.healthPriority,
        sourceIds: normalizeSourceIdArray(slot.sourceIds),
      };
    }

    overrideApplied = true;
    v.forEach((item) => allViolations.add(item));
    return {
      ...slot,
      healthPriority: true,
      whatToDo:
        locale === "hi"
          ? "इस अवधि में बाहरी श्रम टालें और घर के भीतर सुरक्षित वायु वातावरण बनाए रखें।"
          : "Keep strenuous activities indoors during this period and prioritize clean indoor air.",
      expectedBenefit:
        locale === "hi"
          ? "उच्च प्रदूषण के दौरान तीव्र कण-संपर्क कम करने में सहायक।"
          : "Helps reduce acute particulate inhalation during elevated pollution.",
      alternativeAction:
        locale === "hi"
          ? "आवश्यक बाहर जाने पर अच्छी फिट वाला N95/FFP2 मास्क उपयोग करें।"
          : "Use a snug N95/FFP2 respirator and enclosed transit for essential trips.",
      sourceIds: normalizeSourceIdArray(slot.sourceIds),
    };
  });

  return {
    data: {
      ...sanitized,
      healthProtectionPriority:
        healthPriority || sanitized.healthProtectionPriority,
      slots: safeSlots,
      sourceIds: normalizeSourceIdArray(sanitized.sourceIds),
    },
    report: {
      passed: allViolations.size === 0,
      violations: Array.from(allViolations),
      conservativeOverrideApplied: overrideApplied,
      emergencyCareAdvisoryAdded: false,
    },
  };
}

export function applyIndoorSafetyPolicy(
  raw: AiIndoorAirResponse,
  ctx: GeminiAirQualityContext,
  locale: Locale
): { data: AiIndoorAirResponse; report: SafetyValidationReport } {
  const sanitized = sanitizeDeepStrings(raw);
  const allViolations = new Set<string>();
  let overrideApplied = false;

  const safeCards = sanitized.cards.map((card) => {
    const v = scanTextForSafetyViolations(
      `${card.title} ${card.suggestedAction} ${card.ventilationGuidance}`,
      { healthProtectionPriority: ctx.deterministicGuidance.healthProtectionPriority }
    );
    if (v.length === 0) {
      return {
        ...card,
        sourceIds: normalizeSourceIdArray(card.sourceIds),
      };
    }
    overrideApplied = true;
    v.forEach((item) => allViolations.add(item));
    return {
      ...card,
      suggestedAction:
        locale === "hi"
          ? "स्रोत नियंत्रण (खाना पकाने का एग्जॉस्ट, गीला पोंछा) और HEPA यांत्रिक फ़िल्ट्रेशन को प्राथमिकता दें।"
          : "Prioritize source control (cooking exhaust, damp mopping) and mechanical HEPA filtration; avoid ozone-emitting devices.",
      sourceIds: ["US_EPA_INDOOR"],
    };
  });

  return {
    data: {
      ...sanitized,
      cards: safeCards,
      sourceIds: normalizeSourceIdArray(sanitized.sourceIds),
    },
    report: {
      passed: allViolations.size === 0,
      violations: Array.from(allViolations),
      conservativeOverrideApplied: overrideApplied,
      emergencyCareAdvisoryAdded: false,
    },
  };
}

export function applySustainabilitySafetyPolicy(
  raw: AiSustainabilityResponse,
  ctx: GeminiAirQualityContext,
  locale: Locale
): { data: AiSustainabilityResponse; report: SafetyValidationReport } {
  const sanitized = sanitizeDeepStrings(raw);
  const healthPriority = ctx.deterministicGuidance.healthProtectionPriority;
  const allViolations = new Set<string>();
  let overrideApplied = false;

  const safeAlts = sanitized.alternatives.map((alt) => {
    const v = scanTextForSafetyViolations(
      `${alt.suggestedAlternative} ${alt.qualitativeEnvironmentalBenefit} ${alt.healthAndPracticalTradeOff}`,
      { healthProtectionPriority: healthPriority, forbidNumericCo2e: true }
    );
    if (v.length === 0) {
      return {
        ...alt,
        sourceIds: normalizeSourceIdArray(alt.sourceIds),
      };
    }
    overrideApplied = true;
    v.forEach((item) => allViolations.add(item));
    return {
      ...alt,
      suggestedAlternative:
        healthPriority
          ? locale === "hi"
            ? "बंद मेट्रो, एसी बस या हाइब्रिड रिमोट कार्य को प्राथमिकता दें ताकि उत्सर्जन और बाहरी स्मॉग संपर्क दोनों कम हों।"
            : "Prefer enclosed metro rail, AC bus transit, or hybrid remote work to curb emissions without increasing smog inhalation."
          : locale === "hi"
            ? "सार्वजनिक परिवहन, कारपूल या ऊर्जा-दक्ष घरेलू आदतों को चुनें।"
            : "Choose public transit, shared carpooling, or household energy efficiency habits.",
      qualitativeEnvironmentalBenefit:
        locale === "hi"
          ? "प्रति-यात्री ईंधन दहन और ग्रीनहाउस गैस उत्सर्जन को कम करने में सहायक।"
          : "Helps reduce per-passenger fossil fuel combustion (compute exact CO2e in the Impact Calculator).",
      sourceIds: normalizeSourceIdArray(alt.sourceIds),
    };
  });

  return {
    data: {
      ...sanitized,
      alternatives: safeAlts,
      sourceIds: normalizeSourceIdArray(sanitized.sourceIds),
    },
    report: {
      passed: allViolations.size === 0,
      violations: Array.from(allViolations),
      conservativeOverrideApplied: overrideApplied,
      emergencyCareAdvisoryAdded: false,
    },
  };
}

export function applyCommunitySafetyPolicy(
  raw: AiCommunityPlanResponse,
  ctx: GeminiAirQualityContext
): { data: AiCommunityPlanResponse; report: SafetyValidationReport } {
  const sanitized = sanitizeDeepStrings(raw);
  const text = [
    sanitized.headline,
    ...sanitized.immediateActions,
    ...sanitized.weeklyActions,
    ...sanitized.expectedQualitativeOutcomes,
  ].join(" ");
  const violations = scanTextForSafetyViolations(text, {
    healthProtectionPriority: ctx.deterministicGuidance.healthProtectionPriority,
    forbidNumericCo2e: true,
  });

  return {
    data: {
      ...sanitized,
      sourceIds: normalizeSourceIdArray(sanitized.sourceIds),
    },
    report: {
      passed: violations.length === 0,
      violations,
      conservativeOverrideApplied: false,
      emergencyCareAdvisoryAdded: false,
    },
  };
}

export function applyImpactExplainSafetyPolicy(
  raw: AiImpactExplainResponse,
  ctx: GeminiAirQualityContext,
  comparison: TransportComparisonResult,
  locale: Locale
): { data: AiImpactExplainResponse; report: SafetyValidationReport } {
  const sanitized = sanitizeDeepStrings(raw);
  const allowedGroundedNumbers = [
    comparison.baseline.dailyKgCo2e,
    comparison.baseline.weeklyKgCo2e,
    comparison.baseline.monthlyKgCo2e,
    comparison.baseline.annualKgCo2e,
    comparison.alternative.dailyKgCo2e,
    comparison.alternative.weeklyKgCo2e,
    comparison.alternative.monthlyKgCo2e,
    comparison.alternative.annualKgCo2e,
    comparison.avoidedDailyKgCo2e,
    comparison.avoidedWeeklyKgCo2e,
    comparison.avoidedMonthlyKgCo2e,
    comparison.avoidedAnnualKgCo2e,
    comparison.baseline.roundTripDistanceKm,
    comparison.baseline.travelDaysPerWeek,
    comparison.baseline.workingWeeksPerYear,
    comparison.baseline.appliedOccupancy,
    comparison.alternative.appliedOccupancy,
    comparison.baseline.factor.numericalFactorKgCo2e,
    comparison.alternative.factor.numericalFactorKgCo2e,
    ...(comparison.percentageChange !== null ? [comparison.percentageChange] : []),
  ];

  const text = [
    sanitized.headline,
    sanitized.whatItMeans,
    sanitized.practicalTradeOffs,
    sanitized.exposureVsClimateNote,
    ...sanitized.nextSteps,
  ].join(" ");

  const violations = scanTextForSafetyViolations(text, {
    healthProtectionPriority: ctx.deterministicGuidance.healthProtectionPriority,
    forbidNumericCo2e: true,
    allowedGroundedNumbers,
  });

  if (violations.length === 0) {
    return {
      data: {
        ...sanitized,
        sourceIds: normalizeSourceIdArray(sanitized.sourceIds),
      },
      report: {
        passed: true,
        violations: [],
        conservativeOverrideApplied: false,
        emergencyCareAdvisoryAdded: false,
      },
    };
  }

  // Conservative deterministic replacement when Gemini modifies or fabricates calculated values
  const avoidedAnnual = comparison.avoidedAnnualKgCo2e;
  const whatItMeans =
    locale === "hi"
      ? `गणना इंजन सत्यापित परिणाम: ${comparison.baseline.factor.labelHi} (${comparison.baseline.annualKgCo2e.toFixed(1)} kg CO2e/वर्ष) की तुलना में ${comparison.alternative.factor.labelHi} (${comparison.alternative.annualKgCo2e.toFixed(1)} kg CO2e/वर्ष) चुनने पर वार्षिक अंतर ${avoidedAnnual.toFixed(1)} kg CO2e है।`
      : `Verified deterministic summary: Switching from ${comparison.baseline.factor.labelEn} (${comparison.baseline.annualKgCo2e.toFixed(1)} kg CO2e/yr) to ${comparison.alternative.factor.labelEn} (${comparison.alternative.annualKgCo2e.toFixed(1)} kg CO2e/yr) results in an annual difference of ${avoidedAnnual.toFixed(1)} kg CO2e (${comparison.percentageNote}).`;

  return {
    data: {
      ...sanitized,
      whatItMeans,
      sourceIds: normalizeSourceIdArray([
        "CEA_INDIA_CO2_V20",
        "INDIA_GHG_TRANSPORT",
        "UK_DESNZ_GHG_2024",
        ...sanitized.sourceIds,
      ]),
    },
    report: {
      passed: false,
      violations,
      conservativeOverrideApplied: true,
      emergencyCareAdvisoryAdded: false,
    },
  };
}
