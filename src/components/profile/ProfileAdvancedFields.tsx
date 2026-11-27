"use client";

import { Check, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Phase04Dictionary } from "@/lib/i18n/phase04-dictionary";
import {
  SELECT_CONTROL_CLASS,
  SUSTAINABILITY_GOALS_LIST,
} from "@/lib/personalization/form-shared";
import type {
  BudgetTier,
  CookingPractice,
  FamilyProfile,
  Locale,
  OutdoorActivityPreference,
  SustainabilityGoal,
  WorkScheduleMode,
} from "@/types/domain";

interface ProfileAdvancedFieldsProps {
  draft: FamilyProfile;
  locale: Locale;
  phase04Dict: Phase04Dictionary;
  onUpdate: (updater: (prev: FamilyProfile) => FamilyProfile) => void;
  onToggleGoal: (goal: SustainabilityGoal) => void;
}

/**
 * Progressive-disclosure section containing schedule, indoor equipment,
 * sustainability goals, and optional sensitivity controls on ProfileView.
 */
export function ProfileAdvancedFields({
  draft,
  locale,
  phase04Dict,
  onUpdate,
  onToggleGoal,
}: ProfileAdvancedFieldsProps) {
  const p4 = phase04Dict.profile;

  return (
    <details className="rounded-2xl border border-border/80 bg-muted/20 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
        {locale === "hi" ? "उन्नत प्राथमिकताएँ" : "Advanced Preferences"}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {locale === "hi"
            ? "शेड्यूल, इनडोर सेटअप, बजट व लक्ष्य"
            : "Schedule, indoor setup, budget & goals"}
        </span>
      </summary>

      <div className="mt-4 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="profile-schedule">{p4.scheduleLabel}</Label>
            <select
              id="profile-schedule"
              value={draft.workScheduleMode ?? "onsite"}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  workScheduleMode: e.target.value as WorkScheduleMode,
                }))
              }
              className={SELECT_CONTROL_CLASS}
            >
              {(
                Object.entries(phase04Dict.workSchedules) as [
                  WorkScheduleMode,
                  string,
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-duration">{p4.commuteDurationLabel}</Label>
            <Input
              id="profile-duration"
              type="number"
              min={0}
              max={480}
              value={draft.commuteDurationMinutes ?? 35}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  commuteDurationMinutes: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-days">{p4.travelDaysLabel}</Label>
            <Input
              id="profile-days"
              type="number"
              min={0}
              max={7}
              value={draft.commuteDaysPerWeek ?? 5}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  commuteDaysPerWeek: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-weeks">{p4.workingWeeksLabel}</Label>
            <Input
              id="profile-weeks"
              type="number"
              min={1}
              max={52}
              value={draft.workingWeeksPerYear ?? 48}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  workingWeeksPerYear: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-cooking">{p4.cookingLabel}</Label>
            <select
              id="profile-cooking"
              value={draft.cookingPractice ?? "lpg_gas"}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  cookingPractice: e.target.value as CookingPractice,
                }))
              }
              className={SELECT_CONTROL_CLASS}
            >
              {(
                Object.entries(phase04Dict.cookingPractices) as [
                  CookingPractice,
                  string,
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-outdoor">
              {locale === "hi" ? "बाहरी गतिविधि समय" : "Outdoor Activity Preference"}
            </Label>
            <select
              id="profile-outdoor"
              value={draft.outdoorPreference ?? "morning_walk"}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  outdoorPreference: e.target.value as OutdoorActivityPreference,
                }))
              }
              className={SELECT_CONTROL_CLASS}
            >
              <option value="morning_walk">
                {locale === "hi" ? "सुबह की सैर" : "Morning Walk"}
              </option>
              <option value="evening_exercise">
                {locale === "hi" ? "शाम का व्यायाम" : "Evening Exercise"}
              </option>
              <option value="mixed_errands">
                {locale === "hi" ? "मिश्रित दैनिक कार्य" : "Mixed Daytime Errands"}
              </option>
              <option value="mostly_indoors">
                {locale === "hi" ? "मुख्यतः घर के भीतर" : "Mostly Indoors"}
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-budget">
              {locale === "hi" ? "बजट स्तर" : "Sustainability Budget"}
            </Label>
            <select
              id="profile-budget"
              value={draft.budgetTier}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  budgetTier: e.target.value as BudgetTier,
                }))
              }
              className={SELECT_CONTROL_CLASS}
            >
              {(
                Object.entries(phase04Dict.budgetLabels) as [BudgetTier, string][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{p4.goalsLabel}</Label>
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
                  {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}
                  {phase04Dict.sustainabilityGoals[g]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
            <div>
              <Label htmlFor="toggle-purifier" className="text-sm font-medium">
                {locale === "hi" ? "HEPA प्यूरीफ़ायर उपलब्ध" : "HEPA Purifier Available"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {locale === "hi"
                  ? "घर के भीतर हवा की रणनीति के लिए।"
                  : "Tailors indoor air tips to your setup."}
              </p>
            </div>
            <Switch
              id="toggle-purifier"
              checked={draft.hasHepaPurifier}
              onCheckedChange={(checked) =>
                onUpdate((p) => ({ ...p, hasHepaPurifier: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
            <div>
              <Label htmlFor="toggle-ventilation" className="text-sm font-medium">
                {locale === "hi" ? "क्रॉस-वेंटिलेशन संभव" : "Can Cross-Ventilate"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {locale === "hi"
                  ? "कम प्रदूषण विंडो में हवा बदलने हेतु।"
                  : "Opposing windows for lower-AQI airing."}
              </p>
            </div>
            <Switch
              id="toggle-ventilation"
              checked={draft.canCrossVentilate}
              onCheckedChange={(checked) =>
                onUpdate((p) => ({ ...p, canCrossVentilate: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/5 p-3.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <Label htmlFor="toggle-sensitivity" className="text-sm font-medium">
                  {p4.sensitivityOptInTitle}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {p4.sensitivityOptInDesc}
                </p>
              </div>
            </div>
            <Switch
              id="toggle-sensitivity"
              checked={Boolean(
                draft.sensitivityOptIn && draft.hasRespiratorySensitivity
              )}
              onCheckedChange={(checked) =>
                onUpdate((p) => ({
                  ...p,
                  sensitivityOptIn: checked,
                  hasRespiratorySensitivity: checked,
                }))
              }
            />
          </div>
        </div>
      </div>
    </details>
  );
}
