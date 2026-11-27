"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Plus,
  Save,
  Trash2,
  X,
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
import { formatSignedCo2eDiff } from "@/lib/impact/transport-calculator";
import type { ActivityType, CommuteMode } from "@/types/domain";

const ACTIVITY_TYPES: readonly ActivityType[] = [
  "used_public_transport",
  "carpooled",
  "avoided_travel",
  "indoor_air_action",
  "community_action",
] as const;

export function ActivityTrackerCard({
  activeBaselineMode,
  activeAlternativeMode,
  activeDistanceKm,
  activeOccupancy,
}: {
  activeBaselineMode: CommuteMode;
  activeAlternativeMode: CommuteMode;
  activeDistanceKm: number;
  activeOccupancy: number;
}) {
  const {
    activities,
    activitySummary,
    logActivity,
    editActivity,
    deleteActivity,
    clearActivities,
    locale,
    phase04Dict,
    addToast,
  } = useAppPreferences();

  const dict = phase04Dict.impact;

  const [activityType, setActivityType] = useState<ActivityType>(
    "used_public_transport"
  );
  const [title, setTitle] = useState("");
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDistance, setEditDistance] = useState<number>(10);

  const isTransportActivity =
    activityType === "used_public_transport" ||
    activityType === "carpooled" ||
    activityType === "avoided_travel";

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateAlert(null);
    const defaultTitle = phase04Dict.activityTypes[activityType];
    const cleanTitle = title.trim() || defaultTitle;
    const dedupeKey = isTransportActivity
      ? `${activityType}:${activeBaselineMode}->${activeAlternativeMode}:${activeDistanceKm}`
      : `${activityType}:${cleanTitle.toLowerCase().slice(0, 40)}`;

    const outcome = logActivity({
      activityType,
      title: cleanTitle,
      dedupeKey,
      baselineMode: isTransportActivity ? activeBaselineMode : undefined,
      alternativeMode: isTransportActivity
        ? activityType === "avoided_travel"
          ? "work_from_home"
          : activeAlternativeMode
        : undefined,
      distanceKm: isTransportActivity ? activeDistanceKm : undefined,
      occupancy: isTransportActivity ? activeOccupancy : undefined,
    });

    if (!outcome.added) {
      setDuplicateAlert(
        outcome.duplicateReason ??
          "Duplicate entry prevented for today."
      );
      return;
    }

    setTitle("");
    addToast(
      locale === "hi"
        ? "पूर्ण गतिविधि स्थानीय इतिहास में जोड़ी गई।"
        : "Completed activity logged locally."
    );
  };

  return (
    <Card className="border-border/80">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
              <span>{dict.trackerTitle}</span>
            </CardTitle>
            <CardDescription>{dict.trackerSubtitle}</CardDescription>
          </div>
          {activities.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearActivities();
                addToast(
                  locale === "hi" ? "इतिहास हटाया गया।" : "Activity history cleared.",
                  "info"
                );
              }}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              <span>{dict.clearAllBtn}</span>
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {locale === "hi" ? "आज की बचत" : "Today Achieved"}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {activitySummary.dailySavingsKgCo2e.toFixed(2)} kg CO₂e
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {locale === "hi" ? "7-दिन बचत" : "7-Day Achieved"}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {activitySummary.weeklySavingsKgCo2e.toFixed(2)} kg CO₂e
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {locale === "hi" ? "30-दिन बचत" : "30-Day Achieved"}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {activitySummary.monthlySavingsKgCo2e.toFixed(2)} kg CO₂e
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {locale === "hi" ? "दर्ज कार्य" : "Logged Actions"}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {activitySummary.totalRecords}
            </p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor="act-type">
              {locale === "hi" ? "गतिविधि प्रकार" : "Action Type"}
            </Label>
            <select
              id="act-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {phase04Dict.activityTypes[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-5">
            <Label htmlFor="act-title">
              {locale === "hi" ? "संक्षिप्त विवरण (वैकल्पिक)" : "Note / Description"}
            </Label>
            <Input
              id="act-title"
              placeholder={
                isTransportActivity
                  ? `${phase04Dict.commuteModes[activeAlternativeMode]} (${activeDistanceKm} km)`
                  : phase04Dict.activityTypes[activityType]
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex items-end sm:col-span-3">
            <Button type="submit" className="w-full gap-1.5">
              <Plus className="size-4" aria-hidden="true" />
              <span>{dict.logActionBtn}</span>
            </Button>
          </div>
        </form>

        {duplicateAlert ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-950 dark:text-amber-200"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{duplicateAlert}</span>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">{dict.achievedSavingsNote}</p>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {locale === "hi"
              ? "अभी तक कोई पूर्ण गतिविधि दर्ज नहीं की गई है।"
              : "No completed actions recorded yet. Log a completed commute swap or indoor habit above."}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {activities.map((rec) => {
              const isEditing = editingId === rec.id;
              return (
                <li
                  key={rec.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card/70 p-3.5 sm:flex-row sm:items-center"
                >
                  {isEditing ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        aria-label="Edit activity title"
                        className="h-8 max-w-xs text-xs"
                      />
                      {rec.baselineMode ? (
                        <Input
                          type="number"
                          min={0}
                          max={300}
                          value={editDistance}
                          onChange={(e) => setEditDistance(Number(e.target.value))}
                          aria-label="Edit distance km"
                          className="h-8 w-24 text-xs"
                        />
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          editActivity(rec.id, {
                            title: editTitle,
                            distanceKm: rec.baselineMode ? editDistance : undefined,
                          });
                          setEditingId(null);
                        }}
                        className="h-8 gap-1"
                      >
                        <Save className="size-3.5" /> Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        className="h-8"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{rec.title}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {phase04Dict.activityTypes[rec.activityType]}
                          </Badge>
                          {rec.calculatedSavingsKgCo2e !== null ? (
                            <Badge variant="secondary" className="text-[11px]">
                              {formatSignedCo2eDiff(rec.calculatedSavingsKgCo2e, 2)} kg CO₂e
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              {locale === "hi" ? "गैर-CO₂e स्वास्थ्य कार्य" : "Health / Non-CO₂e"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {rec.dateKey}
                          {rec.distanceKm !== undefined ? ` · ${rec.distanceKm} km` : ""}
                          {rec.emissionFactorVersion ? ` · Registry ${rec.emissionFactorVersion}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Edit activity"
                          onClick={() => {
                            setEditingId(rec.id);
                            setEditTitle(rec.title);
                            setEditDistance(rec.distanceKm ?? 10);
                          }}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Delete activity"
                          onClick={() => deleteActivity(rec.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
