"use client";

import { Scale } from "lucide-react";
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
import type { Phase04Dictionary } from "@/lib/i18n/phase04-dictionary";
import {
  COMMUTE_MODES,
  SELECT_CONTROL_CLASS,
} from "@/lib/personalization/form-shared";
import type { CommuteMode, EmissionFactorEntry, Locale } from "@/types/domain";

type SupportedMode = Exclude<CommuteMode, "walk_cycle">;

export interface ImpactPresetPatch {
  base?: SupportedMode;
  alt?: SupportedMode;
  baseDays?: number;
  altDays?: number;
  baseOcc?: number;
  altOcc?: number;
}

export function ImpactPresetBar({
  baselineMode,
  locale,
  dict,
  onApplyPreset,
}: {
  baselineMode: SupportedMode;
  locale: Locale;
  dict: Phase04Dictionary["impact"];
  onApplyPreset: (preset: ImpactPresetPatch) => void;
}) {
  const isHi = locale === "hi";
  const presets: { label: string; patch: ImpactPresetPatch }[] = [
    {
      label: isHi ? "पेट्रोल कार बनाम मेट्रो" : "Petrol Car vs Metro",
      patch: { base: "car_petrol", alt: "metro_rail", baseDays: 5, altDays: 5, baseOcc: 1 },
    },
    {
      label: isHi ? "अकेले ड्राइव बनाम कारपूल (3)" : "Solo vs Carpool (3p)",
      patch: { base: "car_petrol", alt: "carpool", baseDays: 5, altDays: 5, baseOcc: 1, altOcc: 3 },
    },
    {
      label: isHi ? "ऑन-साइट बनाम रिमोट" : "On-site vs Remote",
      patch: {
        base: baselineMode === "work_from_home" ? "car_petrol" : baselineMode,
        alt: "work_from_home",
        baseDays: 5,
        altDays: 5,
      },
    },
    {
      label: isHi ? "हाइब्रिड शेड्यूल (5 → 3 दिन)" : "Hybrid Schedule (5d → 3d)",
      patch: { base: baselineMode, alt: baselineMode, baseDays: 5, altDays: 3 },
    },
    {
      label: isHi ? "बस → कार (नकारात्मक जांच)" : "Bus → Petrol Car (+Increase)",
      patch: { base: "bus", alt: "car_petrol", baseDays: 5, altDays: 5, baseOcc: 1, altOcc: 1 },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        {dict.scenarioPresetsTitle}:
      </span>
      {presets.map((p) => (
        <Button
          key={p.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset(p.patch)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}

export function ImpactWhatIfCard({
  distanceKm,
  baselineMode,
  altMode,
  baseDaysPerWeek,
  altDaysPerWeek,
  workingWeeks,
  clampedBaseOcc,
  clampedAltOcc,
  baseFactor,
  altFactor,
  locale,
  phase04Dict,
  onUpdateValues,
  onSetAltOccupancy,
}: {
  distanceKm: number;
  baselineMode: SupportedMode;
  altMode: SupportedMode;
  baseDaysPerWeek: number;
  altDaysPerWeek: number;
  workingWeeks: number;
  clampedBaseOcc: number;
  clampedAltOcc: number;
  baseFactor: EmissionFactorEntry;
  altFactor: EmissionFactorEntry;
  locale: Locale;
  phase04Dict: Phase04Dictionary;
  onUpdateValues: (patch: {
    distanceKm?: number;
    baselineMode?: SupportedMode;
    altMode?: SupportedMode;
    baseDaysPerWeek?: number;
    altDaysPerWeek?: number;
    workingWeeks?: number;
    baseOccupancy?: number;
  }) => void;
  onSetAltOccupancy: (occ: number) => void;
}) {
  const dict = phase04Dict.impact;
  const isHi = locale === "hi";

  return (
    <Card className="border-border/80 lg:col-span-5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4 text-primary" aria-hidden="true" />
          <span>{dict.whatIfTitle}</span>
        </CardTitle>
        <CardDescription>
          {isHi
            ? "दूरी, साधन और दिन बदलकर तुरंत उत्सर्जन अंतर देखें।"
            : "Adjust daily distance, travel modes, and days per week."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="impact-distance">{dict.distanceLabel}</Label>
            <span className="text-xs font-semibold tabular-nums text-primary">
              {distanceKm} km
            </span>
          </div>
          <input
            type="range"
            aria-label={dict.distanceLabel}
            min={0}
            max={120}
            step={0.5}
            value={Math.min(120, distanceKm)}
            onChange={(e) => onUpdateValues({ distanceKm: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <Input
            id="impact-distance"
            type="number"
            min={0}
            max={500}
            step={0.5}
            value={distanceKm}
            onChange={(e) =>
              onUpdateValues({ distanceKm: Math.max(0, Number(e.target.value)) })
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="impact-baseline">{dict.baselineModeLabel}</Label>
            <select
              id="impact-baseline"
              value={baselineMode}
              onChange={(e) =>
                onUpdateValues({ baselineMode: e.target.value as SupportedMode })
              }
              className={SELECT_CONTROL_CLASS}
            >
              {COMMUTE_MODES.map((m) => (
                <option key={m} value={m}>
                  {phase04Dict.commuteModes[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="impact-alt">{dict.altModeLabel}</Label>
            <select
              id="impact-alt"
              value={altMode}
              onChange={(e) =>
                onUpdateValues({ altMode: e.target.value as SupportedMode })
              }
              className={SELECT_CONTROL_CLASS}
            >
              {COMMUTE_MODES.map((m) => (
                <option key={m} value={m}>
                  {phase04Dict.commuteModes[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="impact-base-days" className="text-xs">
            {dict.daysLabel}
          </Label>
          <Input
            id="impact-base-days"
            type="number"
            min={0}
            max={7}
            value={baseDaysPerWeek}
            onChange={(e) => {
              const next = Math.min(7, Math.max(0, Number(e.target.value)));
              onUpdateValues({ baseDaysPerWeek: next, altDaysPerWeek: next });
            }}
          />
        </div>

        <details className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs">
          <summary className="cursor-pointer select-none font-medium text-foreground">
            {isHi ? "उन्नत सेटिंग्स" : "Advanced Settings"}
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="impact-alt-days" className="text-xs">
                  {isHi ? "वैकल्पिक दिन/सप्ताह" : "Alternative days/wk"}
                </Label>
                <Input
                  id="impact-alt-days"
                  type="number"
                  min={0}
                  max={7}
                  value={altDaysPerWeek}
                  onChange={(e) =>
                    onUpdateValues({
                      altDaysPerWeek: Math.min(7, Math.max(0, Number(e.target.value))),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="impact-weeks" className="text-xs">
                  {dict.weeksLabel}
                </Label>
                <Input
                  id="impact-weeks"
                  type="number"
                  min={1}
                  max={52}
                  value={workingWeeks}
                  onChange={(e) =>
                    onUpdateValues({
                      workingWeeks: Math.min(52, Math.max(1, Number(e.target.value))),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {baseFactor.basis === "vehicle_km" ? (
                <div className="space-y-1">
                  <Label
                    htmlFor="impact-base-occ"
                    className="text-[11px] text-muted-foreground"
                  >
                    {isHi ? "वर्तमान" : "Current"} {dict.occupancyLabel} (
                    {baseFactor.minOccupancy}–{baseFactor.maxOccupancy})
                  </Label>
                  <Input
                    id="impact-base-occ"
                    type="number"
                    min={baseFactor.minOccupancy}
                    max={baseFactor.maxOccupancy}
                    value={clampedBaseOcc}
                    onChange={(e) =>
                      onUpdateValues({ baseOccupancy: Number(e.target.value) || 1 })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              ) : null}

              {altFactor.basis === "vehicle_km" ? (
                <div className="space-y-1">
                  <Label
                    htmlFor="impact-alt-occ"
                    className="text-[11px] text-muted-foreground"
                  >
                    {isHi ? "वैकल्पिक" : "Alt"} {dict.occupancyLabel} (
                    {altFactor.minOccupancy}–{altFactor.maxOccupancy})
                  </Label>
                  <Input
                    id="impact-alt-occ"
                    type="number"
                    min={altFactor.minOccupancy}
                    max={altFactor.maxOccupancy}
                    value={clampedAltOcc}
                    onChange={(e) => onSetAltOccupancy(Number(e.target.value) || 1)}
                    className="h-8 text-xs"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
