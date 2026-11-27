import { z } from "zod";
import { EMISSION_FACTOR_REGISTRY_VERSION } from "@/lib/impact/emission-factors";
import { calculateTransportScenario } from "@/lib/impact/transport-calculator";
import { commuteModeSchema } from "@/lib/schemas";
import type {
  ActivityLogRecord,
  ActivitySummary,
  ActivityType,
  CommuteMode,
} from "@/types/domain";

export const ACTIVITY_STORAGE_KEY = "vayuwise.activities.v1";

export const activityTypeSchema = z.enum([
  "used_public_transport",
  "carpooled",
  "avoided_travel",
  "indoor_air_action",
  "daily_planner_action",
  "community_action",
]);

export const activityRecordSchema = z.object({
  id: z.string().min(1),
  dedupeKey: z.string().min(1),
  activityType: activityTypeSchema,
  title: z.string().trim().min(1).max(160),
  completedAtIso: z.string().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baselineMode: commuteModeSchema.optional(),
  alternativeMode: commuteModeSchema.optional(),
  distanceKm: z.number().min(0).max(500).optional(),
  occupancy: z.number().int().min(1).max(6).optional(),
  calculatedSavingsKgCo2e: z.number().nullable(),
  emissionFactorVersion: z.string().nullable(),
  notes: z.string().max(240).optional(),
});

export function getLocalDateKey(isoOrDate: Date | string = new Date()): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministically computes single-trip savings when baseline & alternative
 * transport parameters are supplied; returns null for non-CO2e indoor/community actions
 * so hypothetical numbers are never invented.
 */
export function computeDeterministicTripSavings(params: {
  baselineMode?: CommuteMode;
  alternativeMode?: CommuteMode;
  distanceKm?: number;
  occupancy?: number;
}): { savingsKgCo2e: number | null; factorVersion: string | null } {
  if (
    !params.baselineMode ||
    !params.alternativeMode ||
    typeof params.distanceKm !== "number" ||
    params.distanceKm < 0
  ) {
    return { savingsKgCo2e: null, factorVersion: null };
  }

  const base = calculateTransportScenario({
    mode: params.baselineMode,
    roundTripDistanceKm: params.distanceKm,
    travelDaysPerWeek: 1,
    workingWeeksPerYear: 1,
    occupancy: 1,
  });
  const alt = calculateTransportScenario({
    mode: params.alternativeMode,
    roundTripDistanceKm: params.distanceKm,
    travelDaysPerWeek: 1,
    workingWeeksPerYear: 1,
    occupancy: params.occupancy,
  });

  const saved = Math.round((base.dailyKgCo2e - alt.dailyKgCo2e) * 1000) / 1000;
  return {
    savingsKgCo2e: saved,
    factorVersion: EMISSION_FACTOR_REGISTRY_VERSION,
  };
}

/**
 * Inserts a completed activity record while strictly blocking duplicate dedupeKeys on the same day.
 */
export function addActivityRecord(
  existing: ActivityLogRecord[],
  input: {
    activityType: ActivityType;
    title: string;
    dedupeKey: string;
    completedAtIso?: string;
    baselineMode?: CommuteMode;
    alternativeMode?: CommuteMode;
    distanceKm?: number;
    occupancy?: number;
    notes?: string;
  }
): {
  records: ActivityLogRecord[];
  added: boolean;
  duplicateReason?: string;
  record?: ActivityLogRecord;
} {
  const completedAtIso = input.completedAtIso ?? new Date().toISOString();
  const dateKey = getLocalDateKey(completedAtIso);
  const canonicalDedupe = `${dateKey}:${input.dedupeKey}`;

  if (existing.some((r) => r.dedupeKey === canonicalDedupe)) {
    return {
      records: existing,
      added: false,
      duplicateReason:
        "This action has already been recorded for today (duplicate counting prevented).",
    };
  }

  const savings = computeDeterministicTripSavings({
    baselineMode: input.baselineMode,
    alternativeMode: input.alternativeMode,
    distanceKm: input.distanceKm,
    occupancy: input.occupancy,
  });

  const record: ActivityLogRecord = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dedupeKey: canonicalDedupe,
    activityType: input.activityType,
    title: input.title.trim().slice(0, 160),
    completedAtIso,
    dateKey,
    baselineMode:
      input.baselineMode === "walk_cycle" ? "walk" : input.baselineMode,
    alternativeMode:
      input.alternativeMode === "walk_cycle" ? "walk" : input.alternativeMode,
    distanceKm: input.distanceKm,
    occupancy: input.occupancy,
    calculatedSavingsKgCo2e: savings.savingsKgCo2e,
    emissionFactorVersion: savings.factorVersion,
    notes: input.notes?.trim().slice(0, 240) || undefined,
  };

  return {
    records: [record, ...existing],
    added: true,
    record,
  };
}

export function updateActivityRecord(
  existing: ActivityLogRecord[],
  id: string,
  patch: {
    title?: string;
    distanceKm?: number;
    notes?: string;
  }
): ActivityLogRecord[] {
  return existing.map((rec) => {
    if (rec.id !== id) return rec;
    const nextDistance =
      typeof patch.distanceKm === "number" ? patch.distanceKm : rec.distanceKm;
    const savings = computeDeterministicTripSavings({
      baselineMode: rec.baselineMode,
      alternativeMode: rec.alternativeMode,
      distanceKm: nextDistance,
      occupancy: rec.occupancy,
    });
    return {
      ...rec,
      title: patch.title !== undefined ? patch.title.trim() || rec.title : rec.title,
      distanceKm: nextDistance,
      notes: patch.notes !== undefined ? patch.notes.trim() || undefined : rec.notes,
      calculatedSavingsKgCo2e:
        rec.baselineMode && rec.alternativeMode
          ? savings.savingsKgCo2e
          : rec.calculatedSavingsKgCo2e,
    };
  });
}

export function removeActivityRecord(
  existing: ActivityLogRecord[],
  id: string
): ActivityLogRecord[] {
  return existing.filter((r) => r.id !== id);
}

export function summarizeActivities(
  records: ActivityLogRecord[],
  referenceDate: Date | null = null
): ActivitySummary {
  const countsByType: Record<ActivityType, number> = {
    used_public_transport: 0,
    carpooled: 0,
    avoided_travel: 0,
    indoor_air_action: 0,
    daily_planner_action: 0,
    community_action: 0,
  };

  if (!referenceDate || records.length === 0) {
    for (const r of records) {
      countsByType[r.activityType] = (countsByType[r.activityType] ?? 0) + 1;
    }
    return {
      totalRecords: records.length,
      dailySavingsKgCo2e: 0,
      weeklySavingsKgCo2e: 0,
      monthlySavingsKgCo2e: 0,
      countsByType,
    };
  }

  const refMs = referenceDate.getTime();
  const todayKey = getLocalDateKey(referenceDate);
  const weekCutoff = refMs - 7 * 86_400_000;
  const monthCutoff = refMs - 30 * 86_400_000;

  let daily = 0;
  let weekly = 0;
  let monthly = 0;

  for (const r of records) {
    countsByType[r.activityType] = (countsByType[r.activityType] ?? 0) + 1;
    const val = r.calculatedSavingsKgCo2e ?? 0;
    const t = new Date(r.completedAtIso).getTime();

    if (r.dateKey === todayKey) {
      daily += val;
    }
    if (!Number.isNaN(t) && t >= weekCutoff && t <= refMs + 86_400_000) {
      weekly += val;
    }
    if (!Number.isNaN(t) && t >= monthCutoff && t <= refMs + 86_400_000) {
      monthly += val;
    }
  }

  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  return {
    totalRecords: records.length,
    dailySavingsKgCo2e: r3(daily),
    weeklySavingsKgCo2e: r3(weekly),
    monthlySavingsKgCo2e: r3(monthly),
    countsByType,
  };
}

export function parseStoredActivities(raw: string | null): ActivityLogRecord[] {
  if (!raw) return [];
  try {
    const json: unknown = JSON.parse(raw);
    if (!Array.isArray(json)) return [];
    const results: ActivityLogRecord[] = [];
    for (const item of json) {
      const parsed = activityRecordSchema.safeParse(item);
      if (!parsed.success) continue;
      const d = parsed.data;
      results.push({
        ...d,
        baselineMode:
          d.baselineMode === "walk_cycle" ? "walk" : d.baselineMode,
        alternativeMode:
          d.alternativeMode === "walk_cycle" ? "walk" : d.alternativeMode,
      });
    }
    return results;
  } catch {
    return [];
  }
}
