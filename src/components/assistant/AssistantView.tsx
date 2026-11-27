"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Leaf,
  MapPin,
  Plus,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Square,
  Trash2,
  User,
  Wind,
} from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
  AiProvenanceBadge,
  WhyRecommendationToggle,
  type AiContextMeta,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import { useAppPreferences } from "@/components/providers/AppProviders";
import type { VerifiedKnowledgeSource } from "@/lib/ai/knowledge-registry";
import type { AiChatResponse } from "@/lib/ai/schemas";
import { classifyUsAqi } from "@/lib/air-quality/intelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AirQualityForecast } from "@/types/domain";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  promptUsed?: string;
  aiGenerated?: boolean;
  provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
  modelUsed?: string;
  structured?: AiChatResponse;
  citations?: VerifiedKnowledgeSource[];
  contextMeta?: AiContextMeta;
}

const QUICK_ACTIONS = {
  en: [
    {
      title: "Protect my family",
      prompt: "How can I protect my family during severe smog?",
      icon: Shield,
    },
    {
      title: "Plan my day",
      prompt: "When should I exercise outdoors or plan essential errands today?",
      icon: Sparkles,
    },
    {
      title: "Improve indoor air",
      prompt: "How can I improve indoor air quality on a budget?",
      icon: Wind,
    },
    {
      title: "Reduce my emissions",
      prompt: "Is public transport a better option for my daily commute?",
      icon: Leaf,
    },
  ],
  hi: [
    {
      title: "परिवार की सुरक्षा",
      prompt: "गंभीर स्मॉग के दौरान मैं अपने परिवार की सुरक्षा कैसे करूं?",
      icon: Shield,
    },
    {
      title: "दिन की योजना",
      prompt: "आज बाहर जाने या व्यायाम के लिए अपेक्षाकृत कम प्रदूषण समय कब है?",
      icon: Sparkles,
    },
    {
      title: "इनडोर हवा सुधारें",
      prompt: "कम बजट में घर के भीतर की हवा को कैसे सुरक्षित रखें?",
      icon: Wind,
    },
    {
      title: "उत्सर्जन कम करें",
      prompt: "क्या दैनिक यात्रा के लिए सार्वजनिक परिवहन बेहतर विकल्प है?",
      icon: Leaf,
    },
  ],
} as const;

export function AssistantView() {
  const {
    addToast,
    selectedLocation,
    profile,
    locale,
    recommendationFingerprint,
    phase04Dict,
  } = useAppPreferences();

  const [generatedFingerprint, setGeneratedFingerprint] = useState<string | null>(
    null
  );
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [liveUsAqi, setLiveUsAqi] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    errorCode?: string;
    fallback?: AiChatResponse;
    contextMeta?: AiContextMeta;
    lastPrompt: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const seqRef = useRef(0);

  const nextId = (prefix: string) => {
    seqRef.current += 1;
    return `${prefix}-${seqRef.current}`;
  };

  // Lightweight ambient AQI badge lookup for the header pill
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(selectedLocation.latitude),
      lon: String(selectedLocation.longitude),
      name: selectedLocation.name,
      country: selectedLocation.country,
      countryCode: selectedLocation.countryCode,
      timezone: selectedLocation.timezone || "auto",
      forecastDays: "1",
    });
    fetch(`/api/air-quality?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((body: { ok?: boolean; forecast?: AirQualityForecast }) => {
        if (!controller.signal.aborted && body.ok && body.forecast) {
          setLiveUsAqi(body.forecast.current.usAqi);
        }
      })
      .catch(() => {
        // leave null cleanly
      });
    return () => controller.abort();
  }, [selectedLocation]);

  useEffect(() => {
    if (
      (messages.length > 0 || isLoading) &&
      typeof scrollEndRef.current?.scrollIntoView === "function"
    ) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, isLoading]);

  const isStale =
    generatedFingerprint !== null &&
    generatedFingerprint !== recommendationFingerprint;

  const sendPrompt = async (text: string, appendUser: boolean = true) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setErrorState(null);
    const historyPayload = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    }));

    if (appendUser) {
      setMessages((prev) => [
        ...prev,
        { id: nextId("u"), role: "user", text: trimmed },
      ]);
      setInput("");
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
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
        }),
      });

      const body = (await res.json()) as {
        ok: boolean;
        aiGenerated?: boolean;
        provenanceMode?: "gemini" | "gemini_safety_adjusted" | "rule_based_fallback";
        modelUsed?: string;
        data?: AiChatResponse;
        fallbackData?: AiChatResponse;
        citations?: VerifiedKnowledgeSource[];
        contextMeta?: AiContextMeta;
        errorCode?: string;
        message?: string;
      };

      if (!res.ok || !body.ok || !body.data) {
        setErrorState({
          message: body.message ?? "Unable to reach Gemini AI.",
          errorCode: body.errorCode,
          fallback: body.fallbackData,
          contextMeta: body.contextMeta,
          lastPrompt: trimmed,
        });
        return;
      }

      setGeneratedFingerprint(recommendationFingerprint);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("a"),
          role: "assistant",
          text: body.data!.reply,
          promptUsed: trimmed,
          aiGenerated: Boolean(body.aiGenerated),
          provenanceMode: body.provenanceMode,
          modelUsed: body.modelUsed,
          structured: body.data,
          citations: body.citations,
          contextMeta: body.contextMeta,
        },
      ]);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorState({
          message:
            locale === "hi"
              ? "AI सेवा से संपर्क करते समय नेटवर्क त्रुटि।"
              : "Network error while contacting AI endpoint.",
          errorCode: "NETWORK_ERROR",
          lastPrompt: trimmed,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateLatest = () => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.promptUsed);
    const fallbackUser = [...messages].reverse().find((m) => m.role === "user");
    const targetPrompt = lastAssistant?.promptUsed ?? fallbackUser?.text;
    if (targetPrompt) {
      void sendPrompt(targetPrompt, false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    addToast(locale === "hi" ? "अनुरोध रद्द किया गया।" : "Request cancelled.", "info");
  };

  const handleUseFallback = () => {
    if (!errorState?.fallback) return;
    const fb = errorState.fallback;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId("fb"),
        role: "assistant",
        text: fb.reply,
        promptUsed: errorState.lastPrompt,
        aiGenerated: false,
        structured: fb,
        contextMeta: errorState.contextMeta,
      },
    ]);
    setErrorState(null);
  };

  const handleCopy = async (msg: ChatEntry) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      addToast(
        locale === "hi" ? "उत्तर क्लिपबोर्ड पर कॉपी किया गया।" : "Response copied to clipboard."
      );
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      addToast(
        locale === "hi"
          ? "इस ब्राउज़र में क्लिपबोर्ड कॉपी उपलब्ध नहीं है।"
          : "Clipboard copy unavailable in this browser.",
        "info"
      );
    }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setErrorState(null);
    setGeneratedFingerprint(null);
    setIsLoading(false);
    addToast(
      locale === "hi" ? "नई बातचीत शुरू की गई।" : "Started a fresh conversation.",
      "info"
    );
  };

  const aqiBadge = classifyUsAqi(liveUsAqi);
  const quickCards = QUICK_ACTIONS[locale];
  const latestAssistantId =
    [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null;

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[460px] flex-col gap-3 lg:h-[calc(100dvh-7.5rem)]">
      {/* Compact Conversation-First Header */}
      <div className="shrink-0 rounded-2xl border border-border/80 bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Bot className="size-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                  {locale === "hi" ? "वायु AI सहायक" : "Vayu AI Assistant"}
                </h1>
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <MapPin className="size-3 text-primary" aria-hidden="true" />
                  {selectedLocation.name} · {locale.toUpperCase()}
                </Badge>
                {liveUsAqi !== null && aqiBadge.band ? (
                  <Badge variant="outline" className={cn("text-[11px]", aqiBadge.band.badgeClass)}>
                    US AQI {Math.round(liveUsAqi)} ·{" "}
                    {locale === "hi" ? aqiBadge.band.labelHi : aqiBadge.band.labelEn}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={showContextDrawer}
              onClick={() => setShowContextDrawer((v) => !v)}
              className="gap-1 text-xs text-muted-foreground"
            >
              <Info className="size-3.5" aria-hidden="true" />
              <span>{locale === "hi" ? "गोपनीयता व प्रोफ़ाइल" : "Context & Privacy"}</span>
              {showContextDrawer ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="gap-1 text-xs"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>{locale === "hi" ? "नई चैट" : "New"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={messages.length === 0 && !errorState}
              className="gap-1 text-xs"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {showContextDrawer ? (
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
            <AiDisclosureNote />
            <PersonalizationStatusStrip generatedFingerprint={generatedFingerprint} />
          </div>
        ) : null}

        {isStale && !showContextDrawer ? (
          <div
            role="status"
            className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-950 dark:text-amber-200"
          >
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{phase04Dict.staleNotice.body}</span>
          </div>
        ) : null}
      </div>

      {/* Main Scrollable Chat Surface + Sticky Composer */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {errorState ? (
            <AiErrorRecoveryCard
              message={errorState.message}
              errorCode={errorState.errorCode}
              onRetry={() => void sendPrompt(errorState.lastPrompt, false)}
              onUseFallback={handleUseFallback}
              hasFallback={Boolean(errorState.fallback)}
            />
          ) : null}

          {messages.length === 0 && !isLoading ? (
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-center py-4 text-center sm:py-8">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="size-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                {locale === "hi" ? "Vayu AI में आपका स्वागत है" : "Welcome to Vayu AI"}
              </h2>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-muted-foreground">
                {locale === "hi"
                  ? `${selectedLocation.name} की वायु गुणवत्ता, इनडोर सुरक्षा और कम-उत्सर्जन यात्रा विकल्पों पर तुरंत मार्गदर्शन पूछें।`
                  : `Ask about ${selectedLocation.name} smog safety, clean indoor air habits, daily timing, or sustainable commute alternatives.`}
              </p>

              {/* 4 Prominent Suggested Action Cards */}
              <div className="mt-5 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                {quickCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.prompt}
                      type="button"
                      disabled={isLoading}
                      onClick={() => void sendPrompt(card.prompt)}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-muted/35 p-3.5 text-left transition-all hover:border-primary/45 hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {card.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {card.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Bot className="size-4" aria-hidden="true" />
                  </div>
                ) : null}

                <div
                  className={cn(
                    "max-w-[92%] space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[82%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/35 text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <AiProvenanceBadge
                        aiGenerated={Boolean(msg.aiGenerated)}
                        provenanceMode={msg.provenanceMode}
                        modelUsed={msg.modelUsed}
                      />
                      <div className="flex items-center gap-1">
                        {msg.id === latestAssistantId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={isLoading}
                            onClick={handleRegenerateLatest}
                            aria-label="Regenerate response"
                          >
                            <RotateCcw className="size-3.5" aria-hidden="true" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => void handleCopy(msg)}
                          aria-label="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3.5 text-primary" aria-hidden="true" />
                          ) : (
                            <Copy className="size-3.5" aria-hidden="true" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <p className="whitespace-pre-line">{msg.text}</p>

                  {msg.structured?.recommendations &&
                  msg.structured.recommendations.length > 0 ? (
                    <div className="space-y-1.5">
                      {msg.structured.recommendations.slice(0, 5).map((rec) => (
                        <div
                          key={rec.id}
                          className="rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-semibold text-foreground">
                              {rec.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {rec.suggestedTiming} · {rec.relativeCost.replace("_", " ")}
                            </span>
                          </div>
                          <p className="mt-0.5 text-foreground/90">{rec.suggestedAction}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {msg.structured?.cautions && msg.structured.cautions.length > 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                      {msg.structured.cautions.map((c) => (
                        <p key={c}>• {c}</p>
                      ))}
                    </div>
                  ) : null}

                  {msg.structured ? (
                    <WhyRecommendationToggle
                      explanation={msg.structured.whyThisRecommendation}
                      contextMeta={msg.contextMeta}
                      dataBasis={msg.structured.dataBasis}
                      sourceIds={msg.structured.sourceIds}
                      citations={msg.citations}
                      limitation={msg.structured.disclaimer}
                    />
                  ) : null}
                </div>

                {msg.role === "user" ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <User className="size-4" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            ))
          )}

          {isLoading ? (
            <div className="flex gap-3" aria-label="Generating response">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="size-4" aria-hidden="true" />
              </div>
              <div className="w-full max-w-md space-y-2 rounded-2xl border border-border bg-muted/45 p-4">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </div>
          ) : null}
          <div ref={scrollEndRef} />
        </div>

        {/* Sticky Composer Visible Inside Initial Viewport */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendPrompt(input);
          }}
          className="shrink-0 flex flex-col gap-2.5 border-t border-border bg-card/95 p-3 sm:flex-row sm:items-end sm:p-4"
        >
          <div className="flex-1">
            <label htmlFor="assistant-message-input" className="sr-only">
              Ask a question about air quality or indoor protection
            </label>
            <Textarea
              id="assistant-message-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendPrompt(input);
                }
              }}
              placeholder={
                locale === "hi"
                  ? "स्मॉग सुरक्षा, इनडोर हवा या यात्रा विकल्पों के बारे में पूछें..."
                  : "Ask about smog safety, indoor air quality, or sustainable commutes (Enter to send)..."
              }
              className="min-h-[52px] resize-none"
            />
          </div>
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="gap-1.5 sm:h-11"
            >
              <Square className="size-3.5" aria-hidden="true" />
              <span>{locale === "hi" ? "रद्द करें" : "Cancel"}</span>
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="gap-1.5 sm:h-11"
            >
              <Send className="size-4" aria-hidden="true" />
              <span>{locale === "hi" ? "भेजें" : "Send"}</span>
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}
