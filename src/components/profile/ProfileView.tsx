"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ProfileAdvancedFields } from "@/components/profile/ProfileAdvancedFields";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import { buildNormalizedPersonalizationContext } from "@/lib/personalization/engine";
import {
  buildInitialProfileDraft,
  COMMUTE_MODES,
  PROFILE_TYPES,
  SELECT_CONTROL_CLASS,
} from "@/lib/personalization/form-shared";
import { CURRENT_PROFILE_VERSION } from "@/lib/personalization/profile-storage";
import { familyProfileSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type {
  CommuteMode,
  FamilyProfile,
  LifestyleCategory,
  Locale,
  SustainabilityGoal,
} from "@/types/domain";

const selectClass = SELECT_CONTROL_CLASS;

export function ProfileView() {
  const {
    profile,
    selectedLocation,
    selectedCityId,
    locale,
    phase04Dict,
    saveProfile,
    resetProfile,
    deleteAllLocalData,
    addToast,
  } = useAppPreferences();

  const p4 = phase04Dict.profile;

  const baseFingerprint = useMemo(() => JSON.stringify(profile), [profile]);
  const baseDraft = useMemo<FamilyProfile>(
    () => buildInitialProfileDraft(profile, selectedLocation),
    [profile, selectedLocation]
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

  const [validationError, setValidationError] = useState<string | null>(null);

  const normalizedPreview = useMemo(
    () =>
      buildNormalizedPersonalizationContext({
        profile: draft,
        location: selectedLocation,
        locale,
      }),
    [draft, selectedLocation, locale]
  );

  const toggleGoal = (goal: SustainabilityGoal) => {
    const existing = draft.sustainabilityGoals ?? [];
    const next = existing.includes(goal)
      ? existing.filter((g) => g !== goal)
      : [...existing, goal];
    setDraft((p) => ({ ...p, sustainabilityGoals: next }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: FamilyProfile = {
      ...draft,
      profileVersion: CURRENT_PROFILE_VERSION,
      hasRespiratorySensitivity: Boolean(
        draft.sensitivityOptIn && draft.hasRespiratorySensitivity
      ),
    };
    const parsed = familyProfileSchema.safeParse(candidate);
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Please check your profile inputs."
      );
      return;
    }

    setValidationError(null);
    saveProfile(parsed.data);
    addToast(
      locale === "hi"
        ? "प्राथमिकताएँ ब्राउज़र में सहेजी गईं।"
        : "Preferences saved locally in your browser."
    );
  };

  const handleReset = () => {
    resetProfile();
    setDraftOverride(null);
    setValidationError(null);
    addToast(
      locale === "hi"
        ? "प्राथमिकताएँ डिफ़ॉल्ट पर रीसेट हुईं।"
        : "Preferences reset to defaults.",
      "info"
    );
  };

  const handleDeleteAll = () => {
    deleteAllLocalData();
    setDraftOverride(null);
    setValidationError(null);
    addToast(p4.deleteConfirmToast, "info");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p4.title}</h1>
          <p className="text-sm text-muted-foreground">{p4.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/onboarding"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Compass className="size-3.5" aria-hidden="true" />
            <span>{p4.launchOnboarding}</span>
          </Link>
          <Badge
            variant="outline"
            className="w-fit gap-1.5 border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300"
          >
            <Lock className="size-3.5" aria-hidden="true" />
            {locale === "hi"
              ? "केवल localStorage · कोई नाम/मेडिकल रिकॉर्ड नहीं"
              : "Local Storage Only · Zero PII"}
          </Badge>
        </div>
      </div>

      {/* Active Normalized Context Preview Strip */}
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {p4.activePrefsTitle} · v{normalizedPreview.profileVersion}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {normalizedPreview.appliedPreferenceLabels.map((lbl) => (
                <Badge key={lbl} variant="secondary" className="text-xs font-normal">
                  {lbl}
                </Badge>
              ))}
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-border bg-background/70 px-3.5 py-2 text-xs">
            <span className="text-muted-foreground">
              {locale === "hi" ? "बेसलाइन यात्रा अनुमान: " : "Est. Baseline Commute: "}
            </span>
            <span className="font-semibold text-foreground">
              {normalizedPreview.transportationPreferences.estimatedAnnualBaselineKgCo2e.toFixed(1)}{" "}
              kg CO₂e/yr
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "hi" ? "गोपनीयता-प्रथम प्राथमिकताएँ" : "Privacy-First Preferences"}
          </CardTitle>
          <CardDescription>
            {locale === "hi"
              ? "हम नाम, सटीक पता या मेडिकल रिकॉर्ड संग्रहीत नहीं करते। संवेदनशीलता सेटिंग वैकल्पिक है।"
              : "VayuWise AI intentionally excludes names, street addresses, and medical records. Optional sensitivity settings stay off unless explicitly enabled."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} noValidate className="space-y-6">
            {validationError ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {validationError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="profile-city">
                  {locale === "hi" ? "शहर" : "City"}
                </Label>
                <select
                  id="profile-city"
                  value={draft.cityId ?? selectedCityId}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      cityId: e.target.value,
                      selectedLocation: DEMO_LOCATIONS.find(
                        (c) => c.id === e.target.value
                      ),
                    }))
                  }
                  className={selectClass}
                >
                  {DEMO_LOCATIONS.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name} ({city.region})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-locale">
                  {locale === "hi" ? "पसंदीदा भाषा" : "Preferred Language"}
                </Label>
                <select
                  id="profile-locale"
                  value={draft.preferredLocale}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      preferredLocale: e.target.value as Locale,
                    }))
                  }
                  className={selectClass}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-lifestyle">
                  {locale === "hi" ? "प्रोफ़ाइल / जीवनशैली प्रकार" : "Profile / Lifestyle Type"}
                </Label>
                <select
                  id="profile-lifestyle"
                  value={draft.lifestyleCategory ?? "family_household"}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      lifestyleCategory: e.target.value as LifestyleCategory,
                    }))
                  }
                  className={selectClass}
                >
                  {PROFILE_TYPES.map((typeKey) => (
                    <option key={typeKey} value={typeKey}>
                      {phase04Dict.profileTypes[typeKey].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-commute">
                  {locale === "hi" ? "मुख्य परिवहन माध्यम" : "Primary Transportation"}
                </Label>
                <select
                  id="profile-commute"
                  value={
                    draft.primaryCommute === "walk_cycle"
                      ? "walk"
                      : draft.primaryCommute
                  }
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      primaryCommute: e.target.value as CommuteMode,
                    }))
                  }
                  className={selectClass}
                >
                  {COMMUTE_MODES.map((m) => (
                    <option key={m} value={m}>
                      {phase04Dict.commuteModes[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-distance">
                  {locale === "hi" ? "दैनिक यात्रा दूरी (किमी)" : "Daily Commute Distance (km)"}
                </Label>
                <Input
                  id="profile-distance"
                  type="number"
                  min={0}
                  max={300}
                  step="0.5"
                  value={draft.dailyCommuteKm}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      dailyCommuteKm: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-occupancy">{p4.occupancyLabel}</Label>
                <Input
                  id="profile-occupancy"
                  type="number"
                  min={1}
                  max={6}
                  value={draft.vehicleOccupancy ?? 1}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      vehicleOccupancy: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-adults">
                  {locale === "hi" ? "वयस्क सदस्य" : "Household Adults"}
                </Label>
                <Input
                  id="profile-adults"
                  type="number"
                  min={1}
                  max={20}
                  value={draft.householdAdults}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      householdAdults: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-children">
                  {locale === "hi" ? "बच्चे" : "Children"}
                </Label>
                <Input
                  id="profile-children"
                  type="number"
                  min={0}
                  max={20}
                  value={draft.childrenCount}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      childrenCount: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-seniors">
                  {locale === "hi" ? "वरिष्ठ नागरिक" : "Senior Citizens"}
                </Label>
                <Input
                  id="profile-seniors"
                  type="number"
                  min={0}
                  max={20}
                  value={draft.seniorsCount}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      seniorsCount: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <ProfileAdvancedFields
              draft={draft}
              locale={locale}
              phase04Dict={phase04Dict}
              onUpdate={setDraft}
              onToggleGoal={toggleGoal}
            />

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" className="gap-1.5">
                <Save className="size-4" aria-hidden="true" />
                <span>
                  {locale === "hi" ? "प्राथमिकताएँ सहेजें" : "Save Preferences"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span>
                  {locale === "hi" ? "डिफ़ॉल्ट रीसेट" : "Reset to Defaults"}
                </span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAll}
                className="gap-1.5"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span>{p4.deleteAllBtn}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
