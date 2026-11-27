"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  Info,
  Leaf,
  MapPin,
  Plus,
  Send,
  Shield,
  Sparkles,
  Square,
  Trash2,
  Wind,
} from "lucide-react";
import {
  AiDisclosureNote,
  AiErrorRecoveryCard,
} from "@/components/ai/AiTransparencyWidgets";
import { PersonalizationStatusStrip } from "@/components/ai/PersonalizationStatusStrip";
import {
  AssistantMessageBubble,
  type ChatEntry,
} from "@/components/assistant/AssistantMessageBubble";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAirQualityForecast } from "@/hooks/useAirQualityForecast";
import {
  postAiEndpoint,
  toAiLocationPayload,
  type AiModuleErrorState,
} from "@/lib/ai/client";
import type { AiChatResponse } from "@/lib/ai/schemas";
import { classifyUsAqi } from "@/lib/air-quality/intelligence";
import { cn } from "@/lib/utils";

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

/**
 * Conversation-first Gemini AI Assistant anchored to server-resolved Open-Meteo telemetry
 * with safety policy enforcement, sticky composer, and expandable verified citations.
 */
export function AssistantView() {
  const {
    addToast,
    selectedLocation,
    profile,
    locale,
    recommendationFingerprint,
    phase04Dict,
  } = useAppPreferences();

  const [generatedFingerprint, setGeneratedFingerprint] = useState<string | null>(null);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<
    (AiModuleErrorState<AiChatResponse> & { lastPrompt: string }) | null
  >(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const seqRef = useRef(0);

  const { activeForecast } = useAirQualityForecast(selectedLocation, {
    forecastDays: 1,
  });
  const liveUsAqi = activeForecast?.current.usAqi ?? null;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [selectedLocation.id]);

  const nextId = (prefix: string) => {
    seqRef.current += 1;
    return `${prefix}-${seqRef.current}`;
  };

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

    const res = await postAiEndpoint<AiChatResponse>({
      endpoint: "/api/ai/chat",
      fallbackErrorMessage: "Unable to reach Gemini AI.",
      networkErrorMessage:
        locale === "hi"
          ? "AI सेवा से संपर्क करते समय नेटवर्क त्रुटि।"
          : "Network error while contacting AI endpoint.",
      signal: controller.signal,
      body: {
        message: trimmed,
        history: historyPayload,
        locale,
        location: toAiLocationPayload(selectedLocation),
        profile,
      },
    });

    setIsLoading(false);
    if (res.aborted) return;

    if (!res.ok || !res.payload) {
      if (res.error) {
        setErrorState({ ...res.error, lastPrompt: trimmed });
      }
      return;
    }

    const { payload } = res;
    setGeneratedFingerprint(recommendationFingerprint);
    setMessages((prev) => [
      ...prev,
      {
        id: nextId("a"),
        role: "assistant",
        text: payload.data.reply,
        promptUsed: trimmed,
        aiGenerated: payload.aiGenerated,
        provenanceMode: payload.provenanceMode,
        modelUsed: payload.modelUsed,
        structured: payload.data,
        citations: payload.citations,
        contextMeta: payload.contextMeta ?? undefined,
      },
    ]);
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
        locale === "hi"
          ? "उत्तर क्लिपबोर्ड पर कॉपी किया गया।"
          : "Response copied to clipboard."
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
                  <Badge
                    variant="outline"
                    className={cn("text-[11px]", aqiBadge.band.badgeClass)}
                  >
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
                <ChevronUp className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden="true" />
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
              <span>{locale === "hi" ? "साफ़ करें" : "Clear"}</span>
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

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80">
        <div
          className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
          role="log"
          aria-live="polite"
          aria-label="Conversation history"
        >
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
                        <p className="text-xs font-semibold text-foreground">{card.title}</p>
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
              <AssistantMessageBubble
                key={msg.id}
                msg={msg}
                isLatestAssistant={msg.id === latestAssistantId}
                isLoading={isLoading}
                copiedId={copiedId}
                onRegenerate={handleRegenerateLatest}
                onCopy={(target) => void handleCopy(target)}
              />
            ))
          )}

          {isLoading ? (
            <div className="flex gap-3" aria-label="Generating response" aria-busy="true">
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
