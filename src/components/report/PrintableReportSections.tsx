import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VERIFIED_KNOWLEDGE_REGISTRY } from "@/lib/ai/knowledge-registry";
import type { DominantPollutantResult, LowerExposureWindowResult, RuleBasedActionBundle } from "@/lib/air-quality/intelligence";
import { formatDateTimeInTz, formatHourInTz, POLLUTANT_DISPLAY_META } from "@/lib/air-quality/intelligence";
import type { Phase04Dictionary } from "@/lib/i18n/phase04-dictionary";
import type {
  ActivitySummary,
  AirQualityForecast,
  CommuteMode,
  FamilyProfile,
  GeoLocation,
  Locale,
  NormalizedPersonalizationContext,
  TransportComparisonResult,
} from "@/types/domain";

export const REPORT_COPY: Record<
  Locale,
  {
    pageTitle: string;
    pageSubtitle: string;
    printBtn: string;
    toggles: {
      preferences: string;
      sensitivity: string;
      dailyPlan: string;
      indoorChecklist: string;
      impact: string;
    };
    sheetSubtitle: string;
    unavailableSource: string;
    sec1: string;
    dominantLabel: string;
    lowerWindowLabel: string;
    sec2: string;
    sensitivityBadge: string;
    sec3: string;
    sec4: string;
    indoorCook: string;
    indoorMop: string;
    indoorHepa: string;
    indoorNoHepa: string;
    sec5: string;
    disclaimer: string;
  }
> = {
  en: {
    pageTitle: "Printable Personalized Air Quality Report",
    pageSubtitle:
      "Select what to include before printing or saving as PDF. Optional respiratory sensitivity details are excluded by default.",
    printBtn: "Print / Save as PDF",
    toggles: {
      preferences: "Include Profile Summary",
      sensitivity: "Include Optional Sensitivity Note",
      dailyPlan: "Include Daily Action Plan",
      indoorChecklist: "Include Indoor Air Checklist",
      impact: "Include Impact & Sustainable Swaps",
    },
    sheetSubtitle: "Smog & Action Brief",
    unavailableSource:
      "Forecast unavailable — ensure internet connectivity and refresh before relying on readings.",
    sec1: "1. Current Modeled Conditions",
    dominantLabel: "Dominant pollutant",
    lowerWindowLabel: "Relatively lower-AQI 2h window",
    sec2: "2. Included Household & Commute Setup",
    sensitivityBadge: "Optional respiratory protection priority included",
    sec3: "3. Personalized Daily Protection Plan",
    sec4: "4. Indoor Air Protection Checklist",
    indoorCook: "Operate kitchen exhaust and cover cooking pans to trap cooking aerosols.",
    indoorMop: "Damp-mop hard floors instead of dry sweeping.",
    indoorHepa: "Run HEPA air cleaner in closed sleeping quarters.",
    indoorNoHepa:
      "Without HEPA, focus on zero indoor combustion (no incense/coils) and sealing window drafts.",
    sec5: "5. Deterministic Commute Emissions Comparison",
    disclaimer:
      "Informational guidance only — not clinical medical advice. Operational CO2e estimates are strictly separate from local ambient PM2.5 inhalation or health-risk reduction.",
  },
  hi: {
    pageTitle: "प्रिंट करने योग्य व्यक्तिगत वायु रिपोर्ट",
    pageSubtitle:
      "चुनें कि रिपोर्ट या PDF में क्या शामिल करना है। संवेदनशीलता प्राथमिकता डिफ़ॉल्ट रूप से बाहर रखी जाती है।",
    printBtn: "प्रिंट / PDF सहेजें",
    toggles: {
      preferences: "प्रोफ़ाइल प्राथमिकताएँ शामिल करें",
      sensitivity: "संवेदनशीलता प्राथमिकता शामिल करें (वैकल्पिक)",
      dailyPlan: "दैनिक कार्य योजना शामिल करें",
      indoorChecklist: "इनडोर वायु चेकलिस्ट शामिल करें",
      impact: "पर्यावरणीय प्रभाव व विकल्प शामिल करें",
    },
    sheetSubtitle: "एयर क्वालिटी व एक्शन रिपोर्ट",
    unavailableSource:
      "Forecast unavailable — ensure internet connectivity and refresh before relying on readings.",
    sec1: "1. वर्तमान मॉडल्ड वायु स्थिति",
    dominantLabel: "प्रमुख प्रदूषक",
    lowerWindowLabel: "अपेक्षाकृत कम-AQI अवधि",
    sec2: "2. शामिल जीवनशैली प्राथमिकताएँ",
    sensitivityBadge: "वैकल्पिक सुरक्षा प्राथमिकता सक्षम",
    sec3: "3. दैनिक स्वास्थ्य-प्रथम योजना",
    sec4: "4. इनडोर वायु सुरक्षा चेकलिस्ट",
    indoorCook: "खाना पकाते समय चिमनी/एग्जॉस्ट चलाएं और बर्तन ढककर रखें।",
    indoorMop: "सूखी झाड़ू के बजाय गीला पोंछा लगाएं।",
    indoorHepa: "सोने से पहले बंद कमरे में HEPA प्यूरीफ़ायर चलाएं।",
    indoorNoHepa:
      "बिना HEPA के कमरे के दरवाजे-खिड़की की दरारें सील रखें और अगरबत्ती/धुएं से बचें।",
    sec5: "5. नियतात्मक यात्रा उत्सर्जन तुलना",
    disclaimer:
      "यह रिपोर्ट केवल पर्यावरणीय जानकारी हेतु है, चिकित्सीय सलाह नहीं। CO2e बचत स्थानीय AQI या रोग जोखिम में मापी गई कमी नहीं दर्शाती।",
  },
};

export function ReportHeader({
  selectedLocation,
  forecast,
  locale,
  aqiBandLabel,
}: {
  selectedLocation: GeoLocation;
  forecast: AirQualityForecast | null;
  locale: Locale;
  aqiBandLabel: string | null;
}) {
  const copy = REPORT_COPY[locale];
  const modelTime = forecast
    ? formatDateTimeInTz(
        forecast.provenance.modelTimestampIso ?? forecast.current.timestampIso,
        forecast.location.timezone
      )
    : null;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          VayuWise AI · Breathe Smarter. Live Greener.
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {selectedLocation.name}
          {selectedLocation.region ? `, ${selectedLocation.region}` : ""} — {copy.sheetSubtitle}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {forecast
            ? `Source: ${forecast.provenance.sourceName} (${forecast.provenance.dataSourceType}) · Standard: ${forecast.provenance.aqiStandard} (distinct from official India CPCB NAQI) · Model time: ${modelTime}`
            : copy.unavailableSource}
        </p>
      </div>
      {forecast && aqiBandLabel ? (
        <Badge variant="outline" className="text-sm font-semibold">
          US AQI {Math.round(forecast.current.usAqi ?? 0)} · {aqiBandLabel}
        </Badge>
      ) : null}
    </header>
  );
}

export function ReportCurrentConditionsSection({
  forecast,
  dominant,
  lowerWindow,
  locale,
}: {
  forecast: AirQualityForecast;
  dominant: DominantPollutantResult;
  lowerWindow: LowerExposureWindowResult | null;
  locale: Locale;
}) {
  const copy = REPORT_COPY[locale];
  const dominantText =
    dominant.reliable && dominant.dominantPollutant
      ? `${copy.dominantLabel}: ${POLLUTANT_DISPLAY_META[dominant.dominantPollutant].symbol} (subindex ${dominant.subindexValue})`
      : locale === "hi"
        ? dominant.reasonHi
        : dominant.reasonEn;

  const lowerWindowText =
    lowerWindow?.available && lowerWindow.bestWindow
      ? ` · ${copy.lowerWindowLabel}: ${formatHourInTz(
          lowerWindow.bestWindow.startIso,
          forecast.location.timezone
        )}–${formatHourInTz(
          lowerWindow.bestWindow.endIso,
          forecast.location.timezone
        )} (avg ${lowerWindow.bestWindow.averageUsAqi})`
      : "";

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{copy.sec1}</h2>
      <p className="text-xs text-muted-foreground">
        {dominantText}
        {lowerWindowText}
      </p>
    </section>
  );
}

export function ReportPreferencesSection({
  normalized,
  includeSensitivity,
  hasRespiratorySensitivity,
  locale,
}: {
  normalized: NormalizedPersonalizationContext;
  includeSensitivity: boolean;
  hasRespiratorySensitivity: boolean;
  locale: Locale;
}) {
  const copy = REPORT_COPY[locale];
  return (
    <section className="space-y-2 border-t border-border/60 pt-4">
      <h2 className="text-base font-semibold">{copy.sec2}</h2>
      <div className="flex flex-wrap gap-1.5">
        {normalized.appliedPreferenceLabels.map((lbl) => (
          <Badge key={lbl} variant="secondary" className="text-xs font-normal">
            {lbl}
          </Badge>
        ))}
        {includeSensitivity && hasRespiratorySensitivity ? (
          <Badge variant="outline" className="text-xs">
            {copy.sensitivityBadge}
          </Badge>
        ) : null}
      </div>
    </section>
  );
}

export function ReportDailyPlanSection({
  guidance,
  locale,
}: {
  guidance: RuleBasedActionBundle;
  locale: Locale;
}) {
  const copy = REPORT_COPY[locale];
  return (
    <section className="space-y-2 border-t border-border/60 pt-4">
      <h2 className="text-base font-semibold">{copy.sec3}</h2>
      <p className="text-sm font-medium">{guidance.headline}</p>
      <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {guidance.items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border p-3">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-0.5 text-muted-foreground">{item.action}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReportIndoorAndImpactSections({
  includeIndoorChecklist,
  includeImpact,
  hasHepaPurifier,
  baseMode,
  impactComparison,
  profile,
  activitySummary,
  phase04Dict,
  locale,
}: {
  includeIndoorChecklist: boolean;
  includeImpact: boolean;
  hasHepaPurifier: boolean;
  baseMode: Exclude<CommuteMode, "walk_cycle">;
  impactComparison: TransportComparisonResult;
  profile: FamilyProfile;
  activitySummary: ActivitySummary;
  phase04Dict: Phase04Dictionary;
  locale: Locale;
}) {
  const copy = REPORT_COPY[locale];
  return (
    <>
      {includeIndoorChecklist ? (
        <section className="space-y-2 border-t border-border/60 pt-4">
          <h2 className="text-base font-semibold">{copy.sec4}</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>{copy.indoorCook}</li>
            <li>{copy.indoorMop}</li>
            <li>{hasHepaPurifier ? copy.indoorHepa : copy.indoorNoHepa}</li>
          </ul>
        </section>
      ) : null}

      {includeImpact ? (
        <section className="space-y-2 border-t border-border/60 pt-4">
          <h2 className="text-base font-semibold">{copy.sec5}</h2>
          <p className="text-xs text-muted-foreground">
            {phase04Dict.commuteModes[baseMode]} ({impactComparison.baseline.annualKgCo2e.toFixed(1)}{" "}
            kg/yr) vs {phase04Dict.commuteModes.metro_rail} (
            {impactComparison.alternative.annualKgCo2e.toFixed(1)} kg/yr) at{" "}
            {profile.dailyCommuteKm} km/day × {profile.commuteDaysPerWeek ?? 5} days/wk:{" "}
            <strong>{impactComparison.percentageNote}</strong>
          </p>
          {activitySummary.totalRecords > 0 ? (
            <p className="text-xs text-muted-foreground">
              Logged completed actions: {activitySummary.totalRecords} (Achieved last 30 days:{" "}
              {activitySummary.monthlySavingsKgCo2e.toFixed(2)} kg CO₂e).
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <p className="flex items-start gap-1.5 font-medium text-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{copy.disclaimer}</span>
        </p>
        <p>
          <strong>Verified References:</strong>{" "}
          {Object.values(VERIFIED_KNOWLEDGE_REGISTRY)
            .map((s) => `${s.title} (${s.organization})`)
            .join(" · ")}
        </p>
      </footer>
    </>
  );
}
