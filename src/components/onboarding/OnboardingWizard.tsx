"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Home,
  MapPin,
  Sparkles,
  TrainFront,
  Users,
} from "lucide-react";
import { OnboardingStepPanel } from "@/components/onboarding/OnboardingStepPanel";
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
import { DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import { buildInitialProfileDraft } from "@/lib/personalization/form-shared";
import { CURRENT_PROFILE_VERSION } from "@/lib/personalization/profile-storage";
import { familyProfileSchema } from "@/lib/schemas";
import type { FamilyProfile, SustainabilityGoal } from "@/types/domain";

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
    () =>
      buildInitialProfileDraft(profile, selectedLocation, {
        preferredLocale: locale,
        includeSelectedLocation: true,
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
          <OnboardingStepPanel
            step={step}
            draft={draft}
            selectedLocation={selectedLocation}
            locale={locale}
            phase04Dict={phase04Dict}
            onUpdate={setDraft}
            onToggleGoal={toggleGoal}
          />

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
