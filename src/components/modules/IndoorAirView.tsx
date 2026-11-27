"use client";

import { useState } from "react";
import {
  CheckSquare,
  Info,
  RefreshCw,
  ShieldAlert,
  Square,
  Wind,
} from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
  AiPrivacyAccordion,
  AiProvenanceBadge,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { EmptyStateCard } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import {
  postAiEndpoint,
  toAiLocationPayload,
  type AiModuleErrorState,
} from "@/lib/ai/client";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiIndoorAirResponse } from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { BudgetTier } from "@/types/domain";

const CHECKLIST_TEMPLATES = {
  en: [
    { id: "cook-exhaust", text: "Run kitchen chimney/exhaust fan & cover pots during frying or tadka." },
    { id: "damp-mop", text: "Wet-mop hard floors instead of dry sweeping to limit PM10 resuspension." },
    { id: "seal-drafts", text: "Seal window/door gaps with towel rolls or weatherstripping during morning/evening peaks." },
    { id: "no-smoke", text: "Avoid indoor incense sticks, scented candles, mosquito coils, and dhoop." },
  ],
  hi: [
    { id: "cook-exhaust", text: "खाना पकाते समय चिमनी/एग्जॉस्ट चलाएं और बर्तन ढककर रखें।" },
    { id: "damp-mop", text: "धूल उड़ने से रोकने के लिए सूखी झाड़ू के बजाय गीला पोंछा लगाएं।" },
    { id: "seal-drafts", text: "सुबह और शाम के स्मॉग पीक में खिड़की-दरवाजों की दरारें बंद रखें।" },
    { id: "no-smoke", text: "घर के अंदर अगरबत्ती, मोमबत्ती, मच्छर कॉइल या धूप जलाने से बचें।" },
  ],
} as const;

export function IndoorAirView() {
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
  const [roomFocus, setRoomFocus] = useState<
    "whole_home" | "living_room" | "bedroom" | "kitchen" | "study_work"
  >("whole_home");
  const [cookingStyle, setCookingStyle] = useState<
    "lpg_gas" | "electric_induction" | "mixed" | "solid_fuel_nearby"
  >(profile.cookingPractice ?? "lpg_gas");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(profile.budgetTier);
  const [completedChecklist, setCompletedChecklist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiIndoorAirResponse | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [provenanceMode, setProvenanceMode] = useState<
    "gemini" | "gemini_safety_adjusted" | "rule_based_fallback" | undefined
  >(undefined);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [citations, setCitations] = useState<VerifiedKnowledgeSource[]>([]);
  const [contextMeta, setContextMeta] = useState<AiContextMeta | null>(null);
  const [errorState, setErrorState] =
    useState<AiModuleErrorState<AiIndoorAirResponse> | null>(null);

  const toggleChecklist = (item: { id: string; text: string }) => {
    const done = completedChecklist.includes(item.id);
    setCompletedChecklist((prev) =>
      done ? prev.filter((x) => x !== item.id) : [...prev, item.id]
    );
    if (!done) {
      const outcome = logActivity({
        activityType: "indoor_air_action",
        title: item.text.slice(0, 120),
        dedupeKey: `indoor:${item.id}`,
      });
      if (outcome.added) {
        addToast(
          locale === "hi"
            ? "इनडोर सुरक्षा कार्य प्रगति में दर्ज हुआ।"
            : "Indoor air action logged to tracker."
        );
      }
    }
  };

  const generateCoach = async () => {
    setLoading(true);
    setErrorState(null);
    const result = await postAiEndpoint<AiIndoorAirResponse>({
      endpoint: "/api/ai/indoor-air",
      body: {
        locale,
        location: toAiLocationPayload(selectedLocation),
        profile,
        roomFocus,
        cookingStyle,
        budgetTier,
        hasPurifier: profile.hasHepaPurifier,
      },
      fallbackErrorMessage: "Unable to reach Indoor Air Coach.",
      networkErrorMessage: "Network error while contacting Indoor Air Coach.",
    });

    if (!result.ok || !result.payload) {
      setErrorState(
        result.error ?? { message: "Unable to reach Indoor Air Coach." }
      );
      setLoading(false);
      return;
    }

    setData(result.payload.data);
    setGeneratedFingerprint(recommendationFingerprint);
    setAiGenerated(result.payload.aiGenerated);
    setProvenanceMode(result.payload.provenanceMode);
    setModelUsed(result.payload.modelUsed);
    setCitations(result.payload.citations);
    setContextMeta(result.payload.contextMeta);
    addToast(
      locale === "hi"
        ? "इनडोर वायु मार्गदर्शन तैयार हुआ।"
        : "Indoor air guidance generated."
    );
    setLoading(false);
  };

  const checklistItems = CHECKLIST_TEMPLATES[locale];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-sky-500/35 bg-sky-500/8 px-3.5 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-sky-400" aria-hidden="true" />
        <span>
          {locale === "hi"
            ? "इनडोर हवा सीधे मापी नहीं गई है — सुझाव Open-Meteo बाहरी डेटा और आपके घर के सेटअप पर आधारित हैं। ओज़ोन जनरेटर या केवल पौधों पर निर्भर न रहें।"
            : "Indoor levels are unmeasured — guidance adapts outdoor Open-Meteo data to your home setup. Avoid ozone generators and never rely on houseplants alone."}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {locale === "hi" ? "अपने घर की हवा सुधारें" : "Improve your home's air"}
              </h1>
              <CardDescription>
                {locale === "hi"
                  ? `${selectedLocation.name} के लिए कम-धुएं और सुरक्षित वेंटिलेशन सलाह।`
                  : `Practical ventilation and low-smoke steps for ${selectedLocation.name}.`}
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => void generateCoach()}
              disabled={loading}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>
                {locale === "hi" ? "इनडोर योजना बनाएँ" : "Generate Indoor Plan"}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="indoor-room-select" className="text-xs">
                {locale === "hi" ? "कमरा" : "Room"}
              </Label>
              <select
                id="indoor-room-select"
                value={roomFocus}
                onChange={(e) => setRoomFocus(e.target.value as typeof roomFocus)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="whole_home">
                  {locale === "hi" ? "पूरा घर" : "Whole Home"}
                </option>
                <option value="bedroom">
                  {locale === "hi" ? "शयनकक्ष (Bedroom)" : "Bedroom"}
                </option>
                <option value="kitchen">
                  {locale === "hi" ? "रसोईघर (Kitchen)" : "Kitchen"}
                </option>
                <option value="living_room">
                  {locale === "hi" ? "लिविंग रूम" : "Living Room"}
                </option>
                <option value="study_work">
                  {locale === "hi" ? "अध्ययन / होम ऑफ़िस" : "Study / Home Office"}
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="indoor-cooking-select" className="text-xs">
                {locale === "hi" ? "रसोई" : "Cooking Setup"}
              </Label>
              <select
                id="indoor-cooking-select"
                value={cookingStyle}
                onChange={(e) =>
                  setCookingStyle(e.target.value as typeof cookingStyle)
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="lpg_gas">LPG / PNG Gas Stove</option>
                <option value="electric_induction">Electric / Induction</option>
                <option value="mixed">Mixed Gas & Electric</option>
                <option value="solid_fuel_nearby">Solid Fuel / Biomass Nearby</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="indoor-budget-select" className="text-xs">
                {locale === "hi" ? "बजट" : "Budget"}
              </Label>
              <select
                id="indoor-budget-select"
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="free">
                  {locale === "hi" ? "शून्य-खर्च आदतें" : "Zero-Cost Habits"}
                </option>
                <option value="low_cost">
                  {locale === "hi" ? "कम-खर्च उपाय" : "Low-Cost Swaps"}
                </option>
                <option value="investment">
                  {locale === "hi" ? "उपकरण निवेश" : "Equipment Investment"}
                </option>
              </select>
            </div>
          </div>

          <AiPrivacyAccordion
            summaryLabel={
              locale === "hi" ? "AI गोपनीयता और प्रोफ़ाइल संदर्भ" : "AI privacy & profile context"
            }
          >
            <PersonalizationStatusStrip generatedFingerprint={generatedFingerprint} />
            <AiDisclosureNote />
          </AiPrivacyAccordion>
        </CardContent>
      </Card>

      {/* Compact Top Actions Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {locale === "hi" ? "आज आप क्या कर सकते हैं" : "What you can do today"}
            </CardTitle>
            <Badge variant="outline">
              {completedChecklist.length}/{checklistItems.length}{" "}
              {locale === "hi" ? "पूर्ण" : "done"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklistItems.map((item) => {
            const checked = completedChecklist.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleChecklist(item)}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-colors ${
                  checked
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-muted/25 text-muted-foreground hover:bg-muted/45"
                }`}
              >
                {checked ? (
                  <CheckSquare className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <Square className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{item.text}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {errorState ? (
        <AiErrorRecoveryCard
          message={errorState.message}
          errorCode={errorState.errorCode}
          onRetry={() => void generateCoach()}
          hasFallback={Boolean(errorState.fallback)}
          onUseFallback={() => {
            if (!errorState.fallback) return;
            setData(errorState.fallback);
            setAiGenerated(false);
            setModelUsed(undefined);
            setContextMeta(errorState.contextMeta ?? null);
            setErrorState(null);
          }}
        />
      ) : null}

      {loading ? (
        <Skeleton className="h-60 w-full rounded-2xl" />
      ) : data ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <AiProvenanceBadge
              aiGenerated={aiGenerated}
              provenanceMode={provenanceMode}
              modelUsed={modelUsed}
            />
            <h2 className="text-base font-semibold sm:text-lg">{data.headline}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {data.ventilationSummary}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {data.cards.slice(0, 3).map((card) => (
              <Card key={card.id} size="sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <Badge variant="secondary" className="gap-1 capitalize">
                      <Wind className="size-3" aria-hidden="true" />
                      {card.room.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {card.relativeCost.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="pt-1 text-sm">{card.title}</CardTitle>
                  <p className="text-xs text-foreground/90">{card.suggestedAction}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <details className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-muted-foreground">
                    <summary className="cursor-pointer select-none font-medium text-foreground/85">
                      {locale === "hi" ? "वेंटिलेशन और कारण" : "Ventilation & details"}
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      <p>{card.whyItMatters}</p>
                      <p className="text-foreground/85">{card.ventilationGuidance}</p>
                      <WhyRecommendationToggle
                        explanation={card.whyThisRecommendation}
                        contextMeta={contextMeta ?? undefined}
                        dataBasis={data.dataBasis}
                        sourceIds={card.sourceIds}
                        citations={citations}
                        limitation={card.caution}
                      />
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.cards.length > 3 ? (
            <details className="rounded-2xl border border-border bg-card p-3.5 text-xs">
              <summary className="cursor-pointer select-none font-semibold text-foreground">
                {locale === "hi"
                  ? `अतिरिक्त ${data.cards.length - 3} कमरे के सुझाव`
                  : `${data.cards.length - 3} more room tips`}
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.cards.slice(3).map((card) => (
                  <Card key={card.id} size="sm">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                      <p>{card.suggestedAction}</p>
                      <p className="text-muted-foreground">{card.ventilationGuidance}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          ) : null}

          <Card className="border-amber-500/30 bg-amber-500/8" size="sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>
                  {locale === "hi" ? "इन आदतों से बचें" : "Things to avoid"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {data.avoidList.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyStateCard
          title={
            locale === "hi"
              ? "कमरे के अनुसार इनडोर वायु योजना बनाएं"
              : "Build a Room-Specific Indoor Air Plan"
          }
          description={
            locale === "hi"
              ? "कमरा, खाना पकाने की प्रणाली और बजट चुनें और व्यक्तिगत सुरक्षा सुझाव पाएं।"
              : "Choose room focus, cooking fuel, and budget above to receive practical low-smoke filtration and ventilation steps."
          }
          action={
            <Button type="button" onClick={() => void generateCoach()}>
              {locale === "hi" ? "इनडोर योजना बनाएँ" : "Generate Indoor Plan"}
            </Button>
          }
        />
      )}
    </div>
  );
}
