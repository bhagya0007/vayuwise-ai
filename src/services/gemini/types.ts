import type {
  AirQualityForecast,
  DailyRoutinePlan,
  FamilyProfile,
  IndoorCoachGuidance,
  Locale,
} from "@/types/domain";

export interface AiResponseEnvelope<T> {
  ok: boolean;
  data: T | null;
  aiGenerated: boolean;
  modelUsed?: string;
  errorCode?: "UNCONFIGURED" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "VALIDATION_ERROR";
  message?: string;
}

export interface GeminiAssistantService {
  generateDailyRoutine(params: {
    forecast: AirQualityForecast;
    profile: FamilyProfile;
    locale: Locale;
  }): Promise<AiResponseEnvelope<DailyRoutinePlan>>;

  generateIndoorCoach(params: {
    forecast: AirQualityForecast;
    profile: FamilyProfile;
    locale: Locale;
  }): Promise<AiResponseEnvelope<IndoorCoachGuidance>>;

  answerQuestion(params: {
    question: string;
    forecast?: AirQualityForecast;
    profile?: FamilyProfile;
    locale: Locale;
  }): Promise<AiResponseEnvelope<{ reply: string; safetyNotice: string }>>;
}
