"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { normalizeLegacyCommuteMode } from "@/lib/personalization/profile-storage";
import { commuteModeSchema } from "@/lib/schemas";
import type { CommuteMode, FamilyProfile } from "@/types/domain";

type SupportedMode = Exclude<CommuteMode, "walk_cycle">;

interface CalculatorValues {
  distanceKm: number;
  baseDaysPerWeek: number;
  altDaysPerWeek: number;
  workingWeeks: number;
  baselineMode: SupportedMode;
  altMode: SupportedMode;
  baseOccupancy: number;
}

/**
 * Keeps Impact Calculator fields synchronized with the saved FamilyProfile (and URL query
 * overrides) until the user intentionally edits calculator controls locally.
 */
export function useSyncedImpactInputs(
  profile: FamilyProfile,
  searchParams: ReadonlyURLSearchParams
) {
  const defaults = useMemo<CalculatorValues>(() => {
    const profileDefaultMode = normalizeLegacyCommuteMode(profile.primaryCommute);
    const defaultBaseFromProfile: SupportedMode =
      profileDefaultMode === "metro_rail" || profileDefaultMode === "work_from_home"
        ? "car_petrol"
        : profileDefaultMode;

    const initialBaseFromUrl = commuteModeSchema.safeParse(searchParams.get("baseline"));
    const initialAltFromUrl = commuteModeSchema.safeParse(searchParams.get("alternative"));
    const rawDistParam = searchParams.get("distance");
    const parsedDistParam =
      rawDistParam !== null && rawDistParam.trim() !== ""
        ? Number(rawDistParam)
        : null;

    const urlDefaultDistance =
      parsedDistParam !== null &&
      Number.isFinite(parsedDistParam) &&
      parsedDistParam >= 0 &&
      parsedDistParam <= 300
        ? parsedDistParam
        : null;

    const baseDays = profile.commuteDaysPerWeek ?? 5;
    return {
      distanceKm: urlDefaultDistance ?? profile.dailyCommuteKm,
      baseDaysPerWeek: baseDays,
      altDaysPerWeek: baseDays,
      workingWeeks: profile.workingWeeksPerYear ?? 48,
      baselineMode: initialBaseFromUrl.success
        ? normalizeLegacyCommuteMode(initialBaseFromUrl.data)
        : defaultBaseFromProfile,
      altMode: initialAltFromUrl.success
        ? normalizeLegacyCommuteMode(initialAltFromUrl.data)
        : "metro_rail",
      baseOccupancy: profile.vehicleOccupancy ?? 1,
    };
  }, [profile, searchParams]);

  const defaultsKey = JSON.stringify(defaults);
  const [overrideState, setOverrideState] = useState<{
    key: string;
    patch: Partial<CalculatorValues>;
  } | null>(null);

  const values: CalculatorValues = useMemo(() => {
    if (overrideState && overrideState.key === defaultsKey) {
      return { ...defaults, ...overrideState.patch };
    }
    return defaults;
  }, [defaults, defaultsKey, overrideState]);

  const updateValues = useCallback(
    (patch: Partial<CalculatorValues>) => {
      setOverrideState((prev) => ({
        key: defaultsKey,
        patch: {
          ...(prev && prev.key === defaultsKey ? prev.patch : {}),
          ...patch,
        },
      }));
    },
    [defaultsKey]
  );

  return { values, updateValues };
}
