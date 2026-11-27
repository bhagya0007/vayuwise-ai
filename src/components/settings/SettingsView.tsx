"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, Trash2 } from "lucide-react";
import { LocaleToggle, ThemeToggle } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HealthStatus {
  geminiConfigured: boolean;
  aiEnabled: boolean;
  geminiModel?: string;
}

export function SettingsView() {
  const { locale, theme, resetProfile, deleteAllLocalData, addToast } =
    useAppPreferences();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const isHi = locale === "hi";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => r.json())
      .then((json: HealthStatus) => setHealth(json))
      .catch(() => {
        // leave null on failure
      });
    return () => controller.abort();
  }, []);

  const handleClearStorage = () => {
    resetProfile();
    addToast(
      isHi ? "स्थानीय प्रोफ़ाइल प्राथमिकताएँ रीसेट हुईं।" : "Local profile preferences cleared.",
      "info"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isHi ? "सेटिंग्स और गोपनीयता" : "Settings & Privacy"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isHi
              ? "दिखावट, भाषा, स्थानीय ब्राउज़र स्टोरेज और लाइव सिस्टम स्थिति प्रबंधित करें।"
              : "Manage appearance, language, browser storage, and inspect live integration status."}
          </p>
        </div>
        <Link
          href="/report"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <FileText className="size-3.5" aria-hidden="true" />
          <span>{isHi ? "प्रिंट रिपोर्ट खोलें" : "Open Printable Report"}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isHi ? "दिखावट और भाषा" : "Appearance & Language"}
            </CardTitle>
            <CardDescription>
              {isHi
                ? "डार्क Obsidian Forest और लाइट Glacier White थीम या अंग्रेज़ी/हिन्दी के बीच स्विच करें।"
                : "Switch between dark-first Obsidian Forest and light Glacier White themes, or English and Hindi labels."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-medium">
                  {isHi ? "थीम मोड" : "Theme Mode"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {isHi ? "सक्रिय:" : "Active:"} {theme}
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-medium">
                  {isHi ? "इंटरफ़ेस भाषा" : "Interface Language"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isHi ? "सक्रिय:" : "Active:"}{" "}
                  {locale === "en" ? "English" : "हिन्दी (Hindi)"}
                </p>
              </div>
              <LocaleToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isHi ? "स्थानीय डेटा व सिस्टम स्थिति" : "Local Data & Integration Status"}
            </CardTitle>
            <CardDescription>
              {isHi
                ? "गैर-संवेदनशील प्राथमिकताएँ केवल ब्राउज़र localStorage में रहती हैं। मुफ्त-टियर Gemini API पर भेजे गए प्रश्न उत्पाद सुधार/समीक्षा हेतु Google द्वारा लॉग किए जा सकते हैं — अतः निजी या चिकित्सीय पहचान न भेजें।"
                : "Non-sensitive preferences stay in browser localStorage. Under Google Gemini unpaid/free-tier API terms, submitted prompts/outputs may be logged or reviewed to improve Google models — do not send sensitive personal or medical identities."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>
                  {isHi ? "डिज़ाइन सिस्टम व PWA शेल" : "Design System & PWA Shell"}
                </span>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />{" "}
                  {isHi ? "सक्रिय" : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Open-Meteo Air Quality & Geocoding</span>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />{" "}
                  {isHi ? "सक्रिय" : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  Server-Side Gemini AI
                  {health?.geminiModel ? ` (${health.geminiModel})` : ""}
                </span>
                {health?.geminiConfigured ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />{" "}
                    {isHi ? "सक्रिय" : "Configured"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="size-3" aria-hidden="true" /> Key Required (.env.local)
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>
                  {isHi
                    ? "नियतात्मक प्रभाव एवं एक्सपोज़र इंजन"
                    : "Deterministic Impact & Exposure Engine"}
                </span>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />{" "}
                  {isHi ? "सक्रिय" : "Active"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearStorage}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span>
                  {isHi ? "प्रोफ़ाइल डिफ़ॉल्ट रीसेट" : "Reset Profile Defaults"}
                </span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteAllLocalData();
                  addToast(
                    isHi
                      ? "सभी स्थानीय प्रोफ़ाइल व गतिविधि रिकॉर्ड हटाए गए।"
                      : "All local profile and activity records deleted.",
                    "info"
                  );
                }}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span>
                  {isHi ? "सारा स्थानीय डेटा हटाएं" : "Delete All Local Data"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
