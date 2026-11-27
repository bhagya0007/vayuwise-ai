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
  AiPrivacyAccordion,
  AiProvenanceBadge,
  ContextMetaStrip,
  WhyRecommendationToggle,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { EmptyStateCard } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { useAiModuleRequest } from "@/hooks/useAiModuleRequest";
import { toAiLocationPayload } from "@/lib/ai/client";
import type { AiDailyPlanResponse } from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
  const [scheduleNote, setScheduleNote] = useState("");
  const [completedWindows, setCompletedWindows] = useState<string[]>([]);

  const {
    loading,
    data: plan,
    generatedFingerprint,
    aiGenerated,
    provenanceMode,
    modelUsed,
    citations,
    contextMeta,
    errorState,
    execute,
    applyFallback,
  } = useAiModuleRequest<AiDailyPlanResponse>({
    endpoint: "/api/ai/plan",
    locationKey: selectedLocation.id,
    fallbackErrorMessage: "Unable to generate AI daily plan.",
    networkErrorMessage:
      locale === "hi"
        ? "दैनिक योजना बनाते समय नेटवर्क त्रुटि हुई।"
        : "Network error while generating daily plan.",
    successToastMessage:
      locale === "hi"
        ? "व्यक्तिगत दैनिक योजना तैयार है।"
        : "Personalized daily plan generated.",
    recommendationFingerprint,
    addToast,
  });

  const generatePlan = async () => {
    await execute(
      {
        locale,
        location: toAiLocationPayload(selectedLocation),
        profile,
        scheduleNote: scheduleNote.trim() || undefined,
      },
      () => setCompletedWindows([])
    );
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
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {locale === "hi" ? "दैनिक वायु योजना" : "Daily Plan"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {locale === "hi"
                ? `${selectedLocation.name} के लिए समय-अनुसार सुरक्षित दिनचर्या।`
                : `Your time-by-time air-safe routine for ${selectedLocation.name}.`}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            <Label htmlFor="planner-schedule-note" className="text-xs text-muted-foreground">
              {locale === "hi"
                ? "वैकल्पिक शेड्यूल नोट (कोई निजी जानकारी न लिखें)"
                : "Optional schedule note (no personal info)"}
            </Label>
            <Input
              id="planner-schedule-note"
              value={scheduleNote}
              onChange={(e) => setScheduleNote(e.target.value)}
              placeholder={
                locale === "hi"
                  ? "उदा.: सुबह 08:00 स्कूल, 09:30 ऑफिस"
                  : "e.g., School drop-off 08:00, office commute 09:30"
              }
              maxLength={300}
            />
          </div>
        </div>

        <AiPrivacyAccordion
          summaryLabel={
            locale === "hi" ? "AI गोपनीयता और प्रोफ़ाइल आधार" : "AI privacy & profile context"
          }
        >
          <PersonalizationStatusStrip generatedFingerprint={generatedFingerprint} />
          <AiDisclosureNote />
        </AiPrivacyAccordion>
      </div>

      {errorState ? (
        <AiErrorRecoveryCard
          message={errorState.message}
          errorCode={errorState.errorCode}
          onRetry={() => void generatePlan()}
          hasFallback={Boolean(errorState.fallback)}
          onUseFallback={applyFallback}
        />
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : plan ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
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
            <h2 className="text-base font-semibold sm:text-lg">{plan.headline}</h2>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none font-medium text-foreground/80">
                {locale === "hi" ? "डेटा और प्रोफ़ाइल स्रोत" : "Data & profile context"}
              </summary>
              <div className="mt-2 space-y-1.5">
                {contextMeta ? <ContextMetaStrip meta={contextMeta} /> : null}
                <p>
                  {locale === "hi" ? "आधार:" : "Basis:"} {plan.dataBasis} ·{" "}
                  {locale === "hi" ? "प्रोफ़ाइल:" : "Profile:"} {plan.personalizationBasis}
                </p>
              </div>
            </details>
          </div>

          <ol className="relative space-y-3 border-l border-border/80 pl-5 sm:pl-6">
            {plan.slots.map((slot) => {
              const done = completedWindows.includes(slot.window);
              return (
                <li key={slot.window} className="relative">
                  <span
                    className="absolute top-5 -left-[25px] flex size-3.5 items-center justify-center rounded-full border-2 border-primary bg-background sm:-left-[29px]"
                    aria-hidden="true"
                  />
                  <Card size="sm" className={done ? "opacity-75" : undefined}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="gap-1 uppercase">
                            <Clock className="size-3" aria-hidden="true" />
                            {slot.window.replace("_", " ")} · {slot.timeRange}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground sm:text-base">
                            {slot.title}
                          </span>
                        </div>
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
                      <p className="text-xs sm:text-sm text-foreground/90">
                        {slot.whatToDo}
                      </p>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <details className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                        <summary className="cursor-pointer select-none font-medium text-foreground/85">
                          {locale === "hi" ? "विवरण और विकल्प" : "Details & alternatives"}
                        </summary>
                        <div className="mt-2.5 space-y-2.5">
                          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                            <div className="rounded-lg border border-border bg-card p-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {locale === "hi" ? "क्यों अनुशंसित" : "Why Recommended"}
                              </p>
                              <p className="mt-1 leading-relaxed">{slot.whyRecommended}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {locale === "hi" ? "अपेक्षित लाभ" : "Expected Benefit"}
                              </p>
                              <p className="mt-1 leading-relaxed">{slot.expectedBenefit}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5">
                              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                <ShieldCheck className="size-3" aria-hidden="true" />
                                {locale === "hi" ? "वैकल्पिक कदम" : "Alternative Action"}
                              </p>
                              <p className="mt-1 leading-relaxed">{slot.alternativeAction}</p>
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
                        </div>
                      </details>
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
