"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckSquare,
  Clock,
  RefreshCw,
  ShieldCheck,
  Square,
} from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
  AiProvenanceBadge,
  ContextMetaStrip,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { EmptyStateCard } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiDailyPlanResponse } from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function PlannerView() {
  const {
    selectedLocation,
    profile,
    locale,
    recommendationFingerprint,
    logActivity,
    addToast,
  } = useAppPreferences();
  const [generatedFingerprint, setGeneratedFingerprint] = useState<string | null>(
    null
  );
  const [scheduleNote, setScheduleNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AiDailyPlanResponse | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [provenanceMode, setProvenanceMode] = useState<
    "gemini" | "gemini_safety_adjusted" | "rule_based_fallback" | undefined
  >(undefined);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [citations, setCitations] = useState<VerifiedKnowledgeSource[]>([]);
  const [contextMeta, setContextMeta] = useState<AiContextMeta | null>(null);
  const [completedWindows, setCompletedWindows] = useState<string[]>([]);
  const [errorState, setErrorState] = useState<{
    message: string;
    errorCode?: string;
    fallback?: AiDailyPlanResponse;
    contextMeta?: AiContextMeta;
  } | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          location: {
            id: selectedLocation.id,
            name: selectedLocation.name,
            region: selectedLocation.region,
            country: selectedLocation.country,
            countryCode: selectedLocation.countryCode,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            timezone: selectedLocation.timezone,
          },
          profile,
          scheduleNote: scheduleNote.trim() || undefined,
        }),
      });

      const body = (await res.json()) as {
        ok: boolean;
        data?: AiDailyPlanResponse;
        fallbackData?: AiDailyPlanResponse;
        aiGenerated?: boolean;
        provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
        modelUsed?: string;
        citations?: VerifiedKnowledgeSource[];
        contextMeta?: AiContextMeta;
        errorCode?: string;
        message?: string;
      };

      if (!res.ok || !body.ok || !body.data) {
        setErrorState({
          message: body.message ?? "Unable to generate AI daily plan.",
          errorCode: body.errorCode,
          fallback: body.fallbackData,
          contextMeta: body.contextMeta,
        });
        return;
      }

      setPlan(body.data);
      setGeneratedFingerprint(recommendationFingerprint);
      setAiGenerated(Boolean(body.aiGenerated));
      setProvenanceMode(body.provenanceMode);
      setModelUsed(body.modelUsed);
      setCitations(body.citations ?? []);
      setContextMeta(body.contextMeta ?? null);
      setCompletedWindows([]);
      addToast(
        locale === "hi"
          ? "व्यक्तिगत दैनिक योजना तैयार है।"
          : "Personalized daily plan generated."
      );
    } catch {
      setErrorState({
        message:
          locale === "hi"
            ? "दैनिक योजना बनाते समय नेटवर्क त्रुटि हुई।"
            : "Network error while generating daily plan.",
        errorCode: "NETWORK_ERROR",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (windowId: string, title?: string) => {
    const alreadyDone = completedWindows.includes(windowId);
    setCompletedWindows((prev) =>
      alreadyDone ? prev.filter((w) => w !== windowId) : [...prev, windowId]
    );
    if (!alreadyDone && title) {
      logActivity({
        activityType: "daily_planner_action",
        title,
        dedupeKey: `planner:${windowId}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <AiDisclosureNote />
      <PersonalizationStatusStrip generatedFingerprint={generatedFingerprint} />

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {locale === "hi" ? "AI दैनिक प्लानर" : "AI Daily Planner"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {locale === "hi"
                ? `${selectedLocation.name} के वर्तमान AQI, पूर्वानुमान और परिवार प्रोफ़ाइल के अनुसार 6-चरण की दैनिक योजना बनाएँ।`
                : `Generate a chronological 6-period plan for ${selectedLocation.name} tailored to current AQI, forecasts, and household profile.`}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void generatePlan()}
            disabled={loading}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>
              {plan
                ? locale === "hi"
                  ? "योजना पुनः बनाएँ"
                  : "Regenerate Plan"
                : locale === "hi"
                  ? "AI दैनिक योजना बनाएँ"
                  : "Generate AI Daily Plan"}
            </span>
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="planner-schedule-note" className="text-xs">
            {locale === "hi"
              ? "वैकल्पिक दैनिक शेड्यूल नोट (कोई संवेदनशील जानकारी न लिखें)"
              : "Optional Daily Schedule Note (no sensitive personal info)"}
          </Label>
          <Input
            id="planner-schedule-note"
            value={scheduleNote}
            onChange={(e) => setScheduleNote(e.target.value)}
            placeholder={
              locale === "hi"
                ? "उदा.: सुबह 08:00 स्कूल ड्रॉप, 09:30 ऑफिस यात्रा, शाम 19:00 घर वापसी"
                : "e.g., School drop-off at 08:00, office commute at 09:30, home by 19:00"
            }
            maxLength={300}
          />
        </div>
      </div>

      {errorState ? (
        <AiErrorRecoveryCard
          message={errorState.message}
          errorCode={errorState.errorCode}
          onRetry={() => void generatePlan()}
          hasFallback={Boolean(errorState.fallback)}
          onUseFallback={() => {
            if (!errorState.fallback) return;
            setPlan(errorState.fallback);
            setAiGenerated(false);
            setModelUsed(undefined);
            setContextMeta(errorState.contextMeta ?? null);
            setErrorState(null);
          }}
        />
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : plan ? (
        <div className="space-y-5">
          <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AiProvenanceBadge
                aiGenerated={aiGenerated}
                provenanceMode={provenanceMode}
                modelUsed={modelUsed}
              />
              <Badge variant="outline" className="gap-1">
                <CalendarClock className="size-3.5 text-primary" aria-hidden="true" />
                {completedWindows.length}/{plan.slots.length}{" "}
                {locale === "hi" ? "पूर्ण" : "completed"}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">{plan.headline}</h2>
            {contextMeta ? <ContextMetaStrip meta={contextMeta} /> : null}
            <p className="text-xs text-muted-foreground">
              {locale === "hi" ? "आधार:" : "Basis:"} {plan.dataBasis} ·{" "}
              {locale === "hi" ? "प्रोफ़ाइल:" : "Profile:"} {plan.personalizationBasis}
            </p>
          </div>

          <ol className="relative space-y-5 border-l border-border/80 pl-5 sm:pl-6">
            {plan.slots.map((slot) => {
              const done = completedWindows.includes(slot.window);
              return (
                <li key={slot.window} className="relative">
                  <span
                    className="absolute top-6 -left-[25px] flex size-3.5 items-center justify-center rounded-full border-2 border-primary bg-background sm:-left-[29px]"
                    aria-hidden="true"
                  />
                  <Card className={done ? "opacity-75" : undefined}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary" className="gap-1 uppercase">
                          <Clock className="size-3" aria-hidden="true" />
                          {slot.window.replace("_", " ")} · {slot.timeRange}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => toggleSlot(slot.window, slot.title)}
                          aria-pressed={done}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                        >
                          {done ? (
                            <CheckSquare className="size-3.5 text-primary" aria-hidden="true" />
                          ) : (
                            <Square className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span>
                            {done
                              ? locale === "hi"
                                ? "पूर्ण"
                                : "Completed"
                              : locale === "hi"
                                ? "पूर्ण चिह्नित करें"
                                : "Mark Done"}
                          </span>
                        </button>
                      </div>
                      <CardTitle className="pt-1 text-base sm:text-lg">
                        {slot.title}
                      </CardTitle>
                      <CardDescription>
                        {slot.whatToDo} ({slot.whenToDoIt})
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border bg-muted/35 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {locale === "hi" ? "क्यों अनुशंसित" : "Why Recommended"}
                          </p>
                          <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                            {slot.whyRecommended}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/35 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {locale === "hi" ? "अपेक्षित लाभ" : "Expected Benefit"}
                          </p>
                          <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                            {slot.expectedBenefit}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                            {locale === "hi" ? "वैकल्पिक कदम" : "Alternative Action"}
                          </p>
                          <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                            {slot.alternativeAction}
                          </p>
                        </div>
                      </div>

                      <WhyRecommendationToggle
                        explanation={slot.whyThisRecommendation}
                        dataBasis={plan.dataBasis}
                        personalizationBasis={plan.personalizationBasis}
                        sourceIds={slot.sourceIds}
                        citations={citations}
                        limitation={slot.caution}
                      />
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <EmptyStateCard
          title={
            locale === "hi"
              ? "अपनी व्यक्तिगत दैनिक योजना बनाएँ"
              : "Generate Your Personalized Daily Plan"
          }
          description={
            locale === "hi"
              ? `${selectedLocation.name} की वायु गुणवत्ता और परिवार प्रोफ़ाइल के आधार पर 6-भाग शेड्यूल बनाने के लिए ऊपर दिए गए बटन पर क्लिक करें।`
              : `Click "Generate AI Daily Plan" above to build a 6-part schedule grounded in ${selectedLocation.name} air quality and your family profile.`
          }
          action={
            <Button type="button" onClick={() => void generatePlan()}>
              {locale === "hi" ? "AI दैनिक योजना बनाएँ" : "Generate AI Daily Plan"}
            </Button>
          }
        />
      )}
    </div>
  );
}
