"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Home,
  Lock,
  MapPin,
  ShieldAlert,
  Sparkles,
  TrainFront,
  Users,
} from "lucide-react";
import { useAppPreferences } from "@/components/providers/AppProviders";
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
import { Switch } from "@/components/ui/switch";
import { DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import { CURRENT_PROFILE_VERSION } from "@/lib/personalization/profile-storage";
import { familyProfileSchema } from "@/lib/schemas";
import type {
  BudgetTier,
  CommuteMode,
  CookingPractice,
  FamilyProfile,
  LifestyleCategory,
  OutdoorActivityPreference,
  SustainabilityGoal,
  WorkScheduleMode,
} from "@/types/domain";

const PROFILE_TYPES: readonly LifestyleCategory[] = [
  "individual",
  "student",
  "working_professional",
  "family_household",
  "senior_citizen",
  "community_representative",
] as const;

const GOALS_LIST: readonly SustainabilityGoal[] = [
  "reduce_commute_emissions",
  "cleaner_indoor_air",
  "low_cost_swaps",
  "protect_vulnerable_members",
  "community_action",
] as const;

const COMMUTE_OPTIONS: readonly Exclude<CommuteMode, "walk_cycle">[] = [
  "car_petrol",
  "car_diesel",
  "car_cng",
  "car_electric",
  "two_wheeler",
  "two_wheeler_electric",
  "carpool",
  "bus",
  "metro_rail",
  "walk",
  "cycle",
  "work_from_home",
] as const;

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

function StepIllustration({ step }: { step: number }) {
  const icons = [MapPin, Users, Compass, TrainFront, Home, Sparkles];
  const ActiveIcon = icons[step] ?? Sparkles;
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
      <ActiveIcon className="size-6" aria-hidden="true" />
      <span
        aria-hidden="true"
        className="absolute -right-1 -top-1 size-3 rounded-full bg-emerald-400/80 ring-4 ring-background"
      />
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const {
    profile,
    selectedLocation,
    selectLocation,
    saveProfile,
    locale,
    phase04Dict,
    addToast,
  } = useAppPreferences();

  const [step, setStep] = useState(0);
  const baseFingerprint = useMemo(() => JSON.stringify(profile), [profile]);
  const baseDraft = useMemo<FamilyProfile>(
    () => ({
      ...profile,
      profileVersion: CURRENT_PROFILE_VERSION,
      selectedLocation: profile.selectedLocation ?? selectedLocation,
      cityId: profile.cityId ?? selectedLocation.id,
      preferredLocale: locale,
      workScheduleMode: profile.workScheduleMode ?? "onsite",
      commuteDurationMinutes: profile.commuteDurationMinutes ?? 35,
      commuteDaysPerWeek: profile.commuteDaysPerWeek ?? 5,
      workingWeeksPerYear: profile.workingWeeksPerYear ?? 48,
      vehicleOccupancy: profile.vehicleOccupancy ?? 1,
      cookingPractice: profile.cookingPractice ?? "lpg_gas",
      sustainabilityGoals: profile.sustainabilityGoals ?? [
        "cleaner_indoor_air",
        "reduce_commute_emissions",
      ],
    }),
    [profile, selectedLocation, locale]
  );

  const [draftOverride, setDraftOverride] = useState<{
    baseFingerprint: string;
    values: FamilyProfile;
  } | null>(null);

  const draft =
    draftOverride && draftOverride.baseFingerprint === baseFingerprint
      ? draftOverride.values
      : baseDraft;

  const setDraft = (updater: (prev: FamilyProfile) => FamilyProfile) => {
    setDraftOverride((curr) => {
      const currentValues =
        curr && curr.baseFingerprint === baseFingerprint ? curr.values : baseDraft;
      return { baseFingerprint, values: updater(currentValues) };
    });
  };

  const ob = phase04Dict.onboarding;
  const totalSteps = ob.steps.length;
  const currentMeta = ob.steps[step];
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

  const toggleGoal = (goal: SustainabilityGoal) => {
    const existing = draft.sustainabilityGoals ?? [];
    const next = existing.includes(goal)
      ? existing.filter((g) => g !== goal)
      : [...existing, goal];
    setDraft((prev) => ({ ...prev, sustainabilityGoals: next }));
  };

  const handleFinish = () => {
    const chosenLoc =
      DEMO_LOCATIONS.find((c) => c.id === draft.cityId) ??
      draft.selectedLocation ??
      selectedLocation;

    const candidate: FamilyProfile = {
      ...draft,
      profileVersion: CURRENT_PROFILE_VERSION,
      onboardingCompleted: true,
      selectedLocation: chosenLoc,
      cityId: chosenLoc.id,
      preferredLocale: locale,
      hasRespiratorySensitivity: Boolean(
        draft.sensitivityOptIn && draft.hasRespiratorySensitivity
      ),
    };

    const parsed = familyProfileSchema.safeParse(candidate);
    if (!parsed.success) {
      addToast(parsed.error.issues[0]?.message ?? "Check profile fields.", "info");
      return;
    }

    selectLocation(chosenLoc, { persistPreference: true });
    saveProfile(parsed.data);
    addToast(
      locale === "hi"
        ? "वैयक्तिकृत प्रोफ़ाइल सहेजी गई!"
        : "Personalized profile saved locally."
    );
    router.push("/dashboard");
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
            {ob.badge}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {ob.title}
          </h1>
          <p className="text-sm text-muted-foreground">{ob.subtitle}</p>
        </div>
        <Button type="button" variant="ghost" onClick={handleSkip} className="self-start sm:self-center">
          {ob.skipAll}
        </Button>
      </div>

      {/* Step progress */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            {ob.stepOf
              .replace("{current}", String(step + 1))
              .replace("{total}", String(totalSteps))}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-1 sm:grid-cols-3 lg:grid-cols-6">
          {ob.steps.map((s, idx) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setStep(idx)}
              className={`rounded-lg px-2 py-1 text-left text-[11px] font-medium transition-colors ${
                idx === step
                  ? "bg-primary/15 text-primary"
                  : idx < step
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <span className="line-clamp-1">
                {idx + 1}. {s.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Step Card */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center gap-4 border-b border-border/60 pb-5">
          <StepIllustration step={step} />
          <div>
            <CardTitle className="text-lg">{currentMeta?.title}</CardTitle>
            <CardDescription>{currentMeta?.subtitle}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {step === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DEMO_LOCATIONS.map((city) => {
                const active = (draft.cityId ?? selectedLocation.id) === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        cityId: city.id,
                        selectedLocation: city,
                      }))
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
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PROFILE_TYPES.map((typeKey) => {
                  const meta = phase04Dict.profileTypes[typeKey];
                  const active = draft.lifestyleCategory === typeKey;
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({ ...p, lifestyleCategory: typeKey }))
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
                      setDraft((p) => ({
                        ...p,
                        householdAdults: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-children">
                    {locale === "hi" ? "बच्चे" : "Children"}
                  </Label>
                  <Input
                    id="ob-children"
                    type="number"
                    min={0}
                    max={20}
                    value={draft.childrenCount}
                    onChange={(e) =>
                      setDraft((p) => ({
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
                      setDraft((p) => ({
                        ...p,
                        seniorsCount: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ob-schedule">{phase04Dict.profile.scheduleLabel}</Label>
                <select
                  id="ob-schedule"
                  value={draft.workScheduleMode ?? "onsite"}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      workScheduleMode: e.target.value as WorkScheduleMode,
                    }))
                  }
                  className={selectClass}
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
                <Label htmlFor="ob-outdoor">
                  {locale === "hi" ? "बाहरी गतिविधि प्राथमिकता" : "Outdoor Activity Preference"}
                </Label>
                <select
                  id="ob-outdoor"
                  value={draft.outdoorPreference ?? "morning_walk"}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      outdoorPreference: e.target.value as OutdoorActivityPreference,
                    }))
                  }
                  className={selectClass}
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
                    setDraft((p) => ({
                      ...p,
                      scheduleWindowSummary: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ob-commute">
                  {locale === "hi" ? "मुख्य यात्रा साधन" : "Primary Commute Mode"}
                </Label>
                <select
                  id="ob-commute"
                  value={draft.primaryCommute === "walk_cycle" ? "walk" : draft.primaryCommute}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      primaryCommute: e.target.value as CommuteMode,
                    }))
                  }
                  className={selectClass}
                >
                  {COMMUTE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {phase04Dict.commuteModes[mode]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-dist">
                  {phase04Dict.impact.distanceLabel}
                </Label>
                <Input
                  id="ob-dist"
                  type="number"
                  min={0}
                  max={300}
                  value={draft.dailyCommuteKm}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      dailyCommuteKm: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-duration">
                  {phase04Dict.profile.commuteDurationLabel}
                </Label>
                <Input
                  id="ob-duration"
                  type="number"
                  min={0}
                  max={480}
                  value={draft.commuteDurationMinutes ?? 35}
                  onChange={(e) =>
                    setDraft((p) => ({
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
                    setDraft((p) => ({
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
                    setDraft((p) => ({
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
                    setDraft((p) => ({
                      ...p,
                      vehicleOccupancy: Math.min(6, Math.max(1, Number(e.target.value) || 1)),
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ob-cooking">{phase04Dict.profile.cookingLabel}</Label>
                  <select
                    id="ob-cooking"
                    value={draft.cookingPractice ?? "lpg_gas"}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        cookingPractice: e.target.value as CookingPractice,
                      }))
                    }
                    className={selectClass}
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
                  <Label htmlFor="ob-budget">
                    {locale === "hi" ? "बजट प्राथमिकता" : "Sustainability Budget"}
                  </Label>
                  <select
                    id="ob-budget"
                    value={draft.budgetTier}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        budgetTier: e.target.value as BudgetTier,
                      }))
                    }
                    className={selectClass}
                  >
                    {(
                      Object.entries(phase04Dict.budgetLabels) as [
                        BudgetTier,
                        string,
                      ][]
                    ).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
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
                      setDraft((p) => ({ ...p, hasHepaPurifier: checked }))
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
                      setDraft((p) => ({ ...p, canCrossVentilate: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>{phase04Dict.profile.goalsLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  {GOALS_LIST.map((g) => {
                    const selected = (draft.sustainabilityGoals ?? []).includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGoal(g)}
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
                    setDraft((p) => ({
                      ...p,
                      sensitivityOptIn: checked,
                      hasRespiratorySensitivity: checked,
                    }))
                  }
                />
              </div>

              {/* Concise Summary */}
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
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span>{ob.back}</span>
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                className="gap-1.5"
              >
                <span>{ob.next}</span>
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleFinish} className="gap-1.5">
                <CheckCircle2 className="size-4" />
                <span>{ob.finish}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
