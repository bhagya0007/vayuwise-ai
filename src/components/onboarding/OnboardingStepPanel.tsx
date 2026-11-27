"use client";

import { Check, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import type { Phase04Dictionary } from "@/lib/i18n/phase04-dictionary";
import {
  COMMUTE_MODES,
  PROFILE_TYPES as BASE_PROFILE_TYPES,
  SUSTAINABILITY_GOALS_LIST,
  WIZARD_SELECT_CONTROL_CLASS,
} from "@/lib/personalization/form-shared";
import type {
  BudgetTier,
  CommuteMode,
  CookingPractice,
  FamilyProfile,
  GeoLocation,
  LifestyleCategory,
  Locale,
  OutdoorActivityPreference,
  SustainabilityGoal,
  WorkScheduleMode,
} from "@/types/domain";

const PROFILE_TYPES: readonly LifestyleCategory[] = BASE_PROFILE_TYPES.filter(
  (t) => t !== "outdoor_fitness"
);

interface OnboardingStepPanelProps {
  step: number;
  draft: FamilyProfile;
  selectedLocation: GeoLocation;
  locale: Locale;
  phase04Dict: Phase04Dictionary;
  onUpdate: (updater: (prev: FamilyProfile) => FamilyProfile) => void;
  onToggleGoal: (goal: SustainabilityGoal) => void;
}

function StepCitySelector({
  draft,
  selectedLocation,
  onUpdate,
}: Pick<OnboardingStepPanelProps, "draft" | "selectedLocation" | "onUpdate">) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DEMO_LOCATIONS.map((city) => {
        const active = (draft.cityId ?? selectedLocation.id) === city.id;
        return (
          <button
            key={city.id}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onUpdate((p) => ({ ...p, cityId: city.id, selectedLocation: city }))
            }
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-semibold">{city.name}</span>
              {active ? <Check className="size-4 text-primary" /> : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {city.region}, {city.country}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StepHouseholdSelector({
  draft,
  locale,
  phase04Dict,
  onUpdate,
}: Pick<OnboardingStepPanelProps, "draft" | "locale" | "phase04Dict" | "onUpdate">) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_TYPES.map((typeKey) => {
          const meta = phase04Dict.profileTypes[typeKey];
          const active = draft.lifestyleCategory === typeKey;
          return (
            <button
              key={typeKey}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onUpdate((p) => ({ ...p, lifestyleCategory: typeKey }))
              }
              className={`rounded-xl border p-3.5 text-left transition-all ${
                active
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold">{meta.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{meta.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="ob-adults">
            {locale === "hi" ? "वयस्क सदस्य" : "Adults (18–59)"}
          </Label>
          <Input
            id="ob-adults"
            type="number"
            min={1}
            max={20}
            value={draft.householdAdults}
            onChange={(e) =>
              onUpdate((p) => ({
                ...p,
                householdAdults: Math.max(1, Number(e.target.value) || 1),
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-children">{locale === "hi" ? "बच्चे" : "Children"}</Label>
          <Input
            id="ob-children"
            type="number"
            min={0}
            max={20}
            value={draft.childrenCount}
            onChange={(e) =>
              onUpdate((p) => ({
                ...p,
                childrenCount: Math.max(0, Number(e.target.value) || 0),
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-seniors">
            {locale === "hi" ? "वरिष्ठ नागरिक (60+)" : "Senior Citizens (60+)"}
          </Label>
          <Input
            id="ob-seniors"
            type="number"
            min={0}
            max={20}
            value={draft.seniorsCount}
            onChange={(e) =>
              onUpdate((p) => ({
                ...p,
                seniorsCount: Math.max(0, Number(e.target.value) || 0),
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function StepSchedulePreferences({
  draft,
  locale,
  phase04Dict,
  onUpdate,
}: Pick<OnboardingStepPanelProps, "draft" | "locale" | "phase04Dict" | "onUpdate">) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="ob-schedule">{phase04Dict.profile.scheduleLabel}</Label>
        <select
          id="ob-schedule"
          value={draft.workScheduleMode ?? "onsite"}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              workScheduleMode: e.target.value as WorkScheduleMode,
            }))
          }
          className={WIZARD_SELECT_CONTROL_CLASS}
        >
          {(
            Object.entries(phase04Dict.workSchedules) as [WorkScheduleMode, string][]
          ).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-outdoor">
          {locale === "hi" ? "बाहरी गतिविधि प्राथमिकता" : "Outdoor Activity Preference"}
        </Label>
        <select
          id="ob-outdoor"
          value={draft.outdoorPreference ?? "morning_walk"}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              outdoorPreference: e.target.value as OutdoorActivityPreference,
            }))
          }
          className={WIZARD_SELECT_CONTROL_CLASS}
        >
          <option value="morning_walk">
            {locale === "hi" ? "सुबह की सैर" : "Morning Walk"}
          </option>
          <option value="evening_exercise">
            {locale === "hi" ? "शाम का व्यायाम" : "Evening Exercise"}
          </option>
          <option value="mixed_errands">
            {locale === "hi" ? "दिन के काम" : "Mixed Daytime Errands"}
          </option>
          <option value="mostly_indoors">
            {locale === "hi" ? "अधिकांश समय घर के अंदर" : "Mostly Indoors"}
          </option>
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ob-window-note">
          {locale === "hi"
            ? "वैकल्पिक शेड्यूल विंडो (कोई व्यक्तिगत जानकारी नहीं)"
            : "Optional Routine Window Summary (non-sensitive)"}
        </Label>
        <Input
          id="ob-window-note"
          placeholder={
            locale === "hi"
              ? "जैसे: कॉलेज 08:30–15:30"
              : "e.g., Office 09:00–18:00 or School drop-off 08:00"
          }
          value={draft.scheduleWindowSummary ?? ""}
          onChange={(e) =>
            onUpdate((p) => ({ ...p, scheduleWindowSummary: e.target.value }))
          }
        />
      </div>
    </div>
  );
}

function StepCommutePreferences({
  draft,
  locale,
  phase04Dict,
  onUpdate,
}: Pick<OnboardingStepPanelProps, "draft" | "locale" | "phase04Dict" | "onUpdate">) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="ob-commute">
          {locale === "hi" ? "मुख्य यात्रा साधन" : "Primary Commute Mode"}
        </Label>
        <select
          id="ob-commute"
          value={draft.primaryCommute === "walk_cycle" ? "walk" : draft.primaryCommute}
          onChange={(e) =>
            onUpdate((p) => ({ ...p, primaryCommute: e.target.value as CommuteMode }))
          }
          className={WIZARD_SELECT_CONTROL_CLASS}
        >
          {COMMUTE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {phase04Dict.commuteModes[mode]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-dist">{phase04Dict.impact.distanceLabel}</Label>
        <Input
          id="ob-dist"
          type="number"
          min={0}
          max={300}
          value={draft.dailyCommuteKm}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              dailyCommuteKm: Math.max(0, Number(e.target.value) || 0),
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-duration">{phase04Dict.profile.commuteDurationLabel}</Label>
        <Input
          id="ob-duration"
          type="number"
          min={0}
          max={480}
          value={draft.commuteDurationMinutes ?? 35}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              commuteDurationMinutes: Math.max(0, Number(e.target.value) || 0),
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-days">{phase04Dict.profile.travelDaysLabel}</Label>
        <Input
          id="ob-days"
          type="number"
          min={0}
          max={7}
          value={draft.commuteDaysPerWeek ?? 5}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              commuteDaysPerWeek: Math.min(7, Math.max(0, Number(e.target.value) || 0)),
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-weeks">{phase04Dict.profile.workingWeeksLabel}</Label>
        <Input
          id="ob-weeks"
          type="number"
          min={1}
          max={52}
          value={draft.workingWeeksPerYear ?? 48}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              workingWeeksPerYear: Math.min(52, Math.max(1, Number(e.target.value) || 1)),
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-occ">{phase04Dict.profile.occupancyLabel}</Label>
        <Input
          id="ob-occ"
          type="number"
          min={1}
          max={6}
          value={draft.vehicleOccupancy ?? 1}
          onChange={(e) =>
            onUpdate((p) => ({
              ...p,
              vehicleOccupancy: Math.min(6, Math.max(1, Number(e.target.value) || 1)),
            }))
          }
        />
      </div>
    </div>
  );
}

function StepIndoorPreferences({
  draft,
  locale,
  phase04Dict,
  onUpdate,
}: Pick<OnboardingStepPanelProps, "draft" | "locale" | "phase04Dict" | "onUpdate">) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ob-cooking">{phase04Dict.profile.cookingLabel}</Label>
          <select
            id="ob-cooking"
            value={draft.cookingPractice ?? "lpg_gas"}
            onChange={(e) =>
              onUpdate((p) => ({
                ...p,
                cookingPractice: e.target.value as CookingPractice,
              }))
            }
            className={WIZARD_SELECT_CONTROL_CLASS}
          >
            {(
              Object.entries(phase04Dict.cookingPractices) as [CookingPractice, string][]
            ).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-budget">
            {locale === "hi" ? "बजट प्राथमिकता" : "Sustainability Budget"}
          </Label>
          <select
            id="ob-budget"
            value={draft.budgetTier}
            onChange={(e) =>
              onUpdate((p) => ({ ...p, budgetTier: e.target.value as BudgetTier }))
            }
            className={WIZARD_SELECT_CONTROL_CLASS}
          >
            {(Object.entries(phase04Dict.budgetLabels) as [BudgetTier, string][]).map(
              ([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="ob-hepa" className="font-medium">
              {locale === "hi" ? "HEPA एयर प्यूरीफ़ायर उपलब्ध" : "HEPA Air Purifier Available"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {locale === "hi"
                ? "न होने पर केवल शून्य-खर्च इनडोर उपाय दिखेंगे।"
                : "When off, we prioritize zero-purifier source control."}
            </p>
          </div>
          <Switch
            id="ob-hepa"
            checked={draft.hasHepaPurifier}
            onCheckedChange={(checked) =>
              onUpdate((p) => ({ ...p, hasHepaPurifier: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="ob-vent" className="font-medium">
              {locale === "hi" ? "क्रॉस-वेंटिलेशन संभव" : "Cross-Ventilation Available"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {locale === "hi"
                ? "कम AQI घंटों में हवा बदलने के सुझावों के लिए।"
                : "Adapts airing tips for cleaner afternoon windows."}
            </p>
          </div>
          <Switch
            id="ob-vent"
            checked={draft.canCrossVentilate}
            onCheckedChange={(checked) =>
              onUpdate((p) => ({ ...p, canCrossVentilate: checked }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function StepGoalsSummary({
  draft,
  selectedLocation,
  locale,
  phase04Dict,
  onUpdate,
  onToggleGoal,
}: Omit<OnboardingStepPanelProps, "step">) {
  const ob = phase04Dict.onboarding;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{phase04Dict.profile.goalsLabel}</Label>
        <div className="flex flex-wrap gap-2">
          {SUSTAINABILITY_GOALS_LIST.map((g) => {
            const selected = (draft.sustainabilityGoals ?? []).includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggleGoal(g)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {selected ? <Check className="size-3.5" /> : null}
                {phase04Dict.sustainabilityGoals[g]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/35 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <div>
            <Label htmlFor="ob-sens-opt" className="font-medium">
              {phase04Dict.profile.sensitivityOptInTitle}
            </Label>
            <p className="text-xs text-muted-foreground">
              {phase04Dict.profile.sensitivityOptInDesc}
            </p>
          </div>
        </div>
        <Switch
          id="ob-sens-opt"
          checked={Boolean(draft.sensitivityOptIn && draft.hasRespiratorySensitivity)}
          onCheckedChange={(checked) =>
            onUpdate((p) => ({
              ...p,
              sensitivityOptIn: checked,
              hasRespiratorySensitivity: checked,
            }))
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-muted/35 p-4 text-xs leading-relaxed">
        <p className="mb-2 flex items-center gap-1.5 font-semibold text-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          {locale === "hi" ? "सारांश समीक्षा" : "Profile Summary"}
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">City: </span>
            {DEMO_LOCATIONS.find((c) => c.id === draft.cityId)?.name ?? selectedLocation.name}
          </p>
          <p>
            <span className="text-muted-foreground">Type: </span>
            {phase04Dict.profileTypes[draft.lifestyleCategory ?? "family_household"].label}
          </p>
          <p>
            <span className="text-muted-foreground">Commute: </span>
            {phase04Dict.commuteModes[draft.primaryCommute]} · {draft.dailyCommuteKm} km ×{" "}
            {draft.commuteDaysPerWeek ?? 5}d/wk
          </p>
          <p>
            <span className="text-muted-foreground">Budget: </span>
            {phase04Dict.budgetLabels[draft.budgetTier]}
          </p>
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-muted-foreground">
          <Lock className="size-3.5 text-primary" />
          {ob.privacyNote}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the active 6-step form panel inside OnboardingWizard to keep step logic modular.
 */
export function OnboardingStepPanel(props: OnboardingStepPanelProps) {
  switch (props.step) {
    case 0:
      return <StepCitySelector {...props} />;
    case 1:
      return <StepHouseholdSelector {...props} />;
    case 2:
      return <StepSchedulePreferences {...props} />;
    case 3:
      return <StepCommutePreferences {...props} />;
    case 4:
      return <StepIndoorPreferences {...props} />;
    case 5:
      return <StepGoalsSummary {...props} />;
    default:
      return null;
  }
}
