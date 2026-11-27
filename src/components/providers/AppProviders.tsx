"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
import { CheckCircle2, Info, X } from "lucide-react";
import { PwaAndOfflineBar } from "@/components/providers/PwaAndOfflineBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DEFAULT_DEMO_CITY_ID,
  DEMO_LOCATIONS,
  getDemoLocationById,
} from "@/lib/demo/air-quality-demo";
import { APP_DICTIONARY, type AppDictionary } from "@/lib/i18n/dictionary";
import {
  PHASE04_DICTIONARY,
  type Phase04Dictionary,
} from "@/lib/i18n/phase04-dictionary";
import {
  ACTIVITY_STORAGE_KEY,
  addActivityRecord,
  parseStoredActivities,
  removeActivityRecord,
  summarizeActivities,
  updateActivityRecord,
} from "@/lib/impact/activity-tracker";
import { computeRecommendationFingerprint } from "@/lib/personalization/engine";
import {
  DEFAULT_FAMILY_PROFILE,
  DEFAULT_LOCATION,
  migratePersistedProfile,
} from "@/lib/personalization/profile-storage";
import {
  familyProfileSchema,
  geoLocationSchema,
  localeSchema,
  themeModeSchema,
} from "@/lib/schemas";
import type {
  ActivityLogRecord,
  ActivitySummary,
  ActivityType,
  CommuteMode,
  FamilyProfile,
  GeoLocation,
  Locale,
  ThemeMode,
} from "@/types/domain";

const STORAGE_KEYS = {
  locale: "vayuwise.locale.v1",
  theme: "vayuwise.theme.v1",
  cityId: "vayuwise.cityId.v1",
  selectedLocation: "vayuwise.selectedLocation.v1",
  recentLocations: "vayuwise.recentLocations.v1",
  profile: "vayuwise.profile.v1",
  activities: ACTIVITY_STORAGE_KEY,
} as const;

export { DEFAULT_FAMILY_PROFILE, DEFAULT_LOCATION };

interface PersistedSnapshot {
  locale: Locale;
  theme: ThemeMode;
  selectedCityId: string;
  selectedLocation: GeoLocation;
  recentLocations: GeoLocation[];
  profile: FamilyProfile;
  activities: ActivityLogRecord[];
}

const DEFAULT_SNAPSHOT: PersistedSnapshot = {
  locale: "en",
  theme: "dark",
  selectedCityId: DEFAULT_DEMO_CITY_ID,
  selectedLocation: DEFAULT_LOCATION,
  recentLocations: [...DEMO_LOCATIONS.slice(0, 4)],
  profile: DEFAULT_FAMILY_PROFILE,
  activities: [],
};

let cachedRawState: string | null = null;
let cachedSnapshot: PersistedSnapshot = DEFAULT_SNAPSHOT;
const storeListeners = new Set<() => void>();

function emitStoreChange() {
  for (const listener of storeListeners) {
    listener();
  }
}

function readSnapshot(): PersistedSnapshot {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;

  try {
    const rawLocale = window.localStorage.getItem(STORAGE_KEYS.locale);
    const rawTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
    const rawCity = window.localStorage.getItem(STORAGE_KEYS.cityId);
    const rawLocation = window.localStorage.getItem(STORAGE_KEYS.selectedLocation);
    const rawRecent = window.localStorage.getItem(STORAGE_KEYS.recentLocations);
    const rawProfile = window.localStorage.getItem(STORAGE_KEYS.profile);
    const rawActivities = window.localStorage.getItem(STORAGE_KEYS.activities);

    const combined = `${rawLocale ?? ""}|${rawTheme ?? ""}|${rawCity ?? ""}|${rawLocation ?? ""}|${rawRecent ?? ""}|${rawProfile ?? ""}|${rawActivities ?? ""}`;
    if (combined === cachedRawState) {
      return cachedSnapshot;
    }

    const parsedLocale = localeSchema.safeParse(rawLocale);
    const parsedTheme = themeModeSchema.safeParse(rawTheme);

    let selectedLocation = rawCity
      ? getDemoLocationById(rawCity)
      : DEFAULT_LOCATION;
    if (rawLocation) {
      const jsonLoc: unknown = JSON.parse(rawLocation);
      const valLoc = geoLocationSchema.safeParse(jsonLoc);
      if (valLoc.success) {
        selectedLocation = valLoc.data;
      }
    }

    let recentLocations: GeoLocation[] = [...DEMO_LOCATIONS.slice(0, 4)];
    if (rawRecent) {
      const jsonRecent: unknown = JSON.parse(rawRecent);
      if (Array.isArray(jsonRecent)) {
        const validItems = jsonRecent
          .map((item) => geoLocationSchema.safeParse(item))
          .filter((res) => res.success)
          .map((res) => res.data);
        if (validItems.length > 0) {
          recentLocations = validItems;
        }
      }
    }

    let parsedProfile = DEFAULT_FAMILY_PROFILE;
    if (rawProfile) {
      const json: unknown = JSON.parse(rawProfile);
      parsedProfile = migratePersistedProfile(json, DEFAULT_FAMILY_PROFILE).profile;
    }

    const activities = parseStoredActivities(rawActivities);

    cachedRawState = combined;
    cachedSnapshot = {
      locale: parsedLocale.success ? parsedLocale.data : "en",
      theme: parsedTheme.success ? parsedTheme.data : "dark",
      selectedCityId: rawCity || selectedLocation.id || DEFAULT_DEMO_CITY_ID,
      selectedLocation,
      recentLocations,
      profile: parsedProfile,
      activities,
    };
    return cachedSnapshot;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function subscribeStore(listener: () => void) {
  storeListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    storeListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export interface ToastMessage {
  id: string;
  title: string;
  tone?: "success" | "info";
}

interface AppPreferencesContextValue {
  locale: Locale;
  theme: ThemeMode;
  selectedCityId: string;
  selectedLocation: GeoLocation;
  recentLocations: GeoLocation[];
  profile: FamilyProfile;
  activities: ActivityLogRecord[];
  activitySummary: ActivitySummary;
  recommendationFingerprint: string;
  dict: AppDictionary;
  phase04Dict: Phase04Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSelectedCityId: (cityId: string) => void;
  selectLocation: (
    location: GeoLocation,
    options?: { persistPreference?: boolean }
  ) => void;
  saveProfile: (next: FamilyProfile) => void;
  resetProfile: () => void;
  deleteAllLocalData: () => void;
  logActivity: (input: {
    activityType: ActivityType;
    title: string;
    dedupeKey: string;
    completedAtIso?: string;
    baselineMode?: CommuteMode;
    alternativeMode?: CommuteMode;
    distanceKm?: number;
    occupancy?: number;
    notes?: string;
  }) => { added: boolean; duplicateReason?: string };
  editActivity: (
    id: string,
    patch: { title?: string; distanceKm?: number; notes?: string }
  ) => void;
  deleteActivity: (id: string) => void;
  clearActivities: () => void;
  addToast: (title: string, tone?: ToastMessage["tone"]) => void;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null
);

export function AppProviders({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeStore,
    readSnapshot,
    () => DEFAULT_SNAPSHOT
  );
  const [ephemeralLocation, setEphemeralLocation] =
    useState<GeoLocation | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  const activeLocation = ephemeralLocation ?? snapshot.selectedLocation;

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setClientNow(new Date());
    });
    const root = document.documentElement;
    root.classList.toggle("dark", snapshot.theme === "dark");
    root.lang = snapshot.locale;
    return () => window.cancelAnimationFrame(rafId);
  }, [snapshot.theme, snapshot.locale]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (title: string, tone: ToastMessage["tone"] = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    },
    []
  );

  const setLocale = useCallback((nextLocale: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.locale, nextLocale);
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(snapshot.locale === "en" ? "hi" : "en");
  }, [setLocale, snapshot.locale]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(snapshot.theme === "light" ? "dark" : "light");
  }, [setTheme, snapshot.theme]);

  const selectLocation = useCallback(
    (
      location: GeoLocation,
      options: { persistPreference?: boolean } = { persistPreference: true }
    ) => {
      const shouldPersist = options.persistPreference !== false && !location.isCurrentCoordinates;
      if (!shouldPersist) {
        setEphemeralLocation(location);
        return;
      }

      setEphemeralLocation(null);
      try {
        window.localStorage.setItem(STORAGE_KEYS.cityId, location.id);
        window.localStorage.setItem(
          STORAGE_KEYS.selectedLocation,
          JSON.stringify(location)
        );
        const deduped = [
          location,
          ...snapshot.recentLocations.filter((c) => c.id !== location.id),
        ].slice(0, 6);
        window.localStorage.setItem(
          STORAGE_KEYS.recentLocations,
          JSON.stringify(deduped)
        );
      } catch {
        // ignore storage quota failures
      }
      emitStoreChange();
    },
    [snapshot.recentLocations]
  );

  const setSelectedCityId = useCallback(
    (cityId: string) => {
      const preset = getDemoLocationById(cityId);
      selectLocation(preset, { persistPreference: true });
    },
    [selectLocation]
  );

  const saveProfile = useCallback((next: FamilyProfile) => {
    const normalized = migratePersistedProfile(next, DEFAULT_FAMILY_PROFILE).profile;
    const validated = familyProfileSchema.parse(normalized);
    setEphemeralLocation(null);
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.profile,
        JSON.stringify(validated)
      );
      if (validated.selectedLocation) {
        window.localStorage.setItem(
          STORAGE_KEYS.cityId,
          validated.selectedLocation.id
        );
        window.localStorage.setItem(
          STORAGE_KEYS.selectedLocation,
          JSON.stringify(validated.selectedLocation)
        );
      } else if (validated.cityId) {
        const loc = getDemoLocationById(validated.cityId);
        window.localStorage.setItem(STORAGE_KEYS.cityId, loc.id);
        window.localStorage.setItem(
          STORAGE_KEYS.selectedLocation,
          JSON.stringify(loc)
        );
      }
      window.localStorage.setItem(
        STORAGE_KEYS.locale,
        validated.preferredLocale
      );
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const resetProfile = useCallback(() => {
    setEphemeralLocation(null);
    try {
      window.localStorage.removeItem(STORAGE_KEYS.profile);
      window.localStorage.setItem(STORAGE_KEYS.cityId, DEFAULT_DEMO_CITY_ID);
      window.localStorage.setItem(
        STORAGE_KEYS.selectedLocation,
        JSON.stringify(DEFAULT_LOCATION)
      );
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const deleteAllLocalData = useCallback(() => {
    setEphemeralLocation(null);
    try {
      window.localStorage.removeItem(STORAGE_KEYS.profile);
      window.localStorage.removeItem(STORAGE_KEYS.activities);
      window.localStorage.removeItem(STORAGE_KEYS.recentLocations);
      window.localStorage.setItem(STORAGE_KEYS.cityId, DEFAULT_DEMO_CITY_ID);
      window.localStorage.setItem(
        STORAGE_KEYS.selectedLocation,
        JSON.stringify(DEFAULT_LOCATION)
      );
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const persistActivities = useCallback((next: ActivityLogRecord[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(next));
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const logActivity = useCallback(
    (input: {
      activityType: ActivityType;
      title: string;
      dedupeKey: string;
      completedAtIso?: string;
      baselineMode?: CommuteMode;
      alternativeMode?: CommuteMode;
      distanceKm?: number;
      occupancy?: number;
      notes?: string;
    }) => {
      const outcome = addActivityRecord(snapshot.activities, input);
      if (outcome.added) {
        persistActivities(outcome.records);
      }
      return {
        added: outcome.added,
        duplicateReason: outcome.duplicateReason,
      };
    },
    [snapshot.activities, persistActivities]
  );

  const editActivity = useCallback(
    (id: string, patch: { title?: string; distanceKm?: number; notes?: string }) => {
      const updated = updateActivityRecord(snapshot.activities, id, patch);
      persistActivities(updated);
    },
    [snapshot.activities, persistActivities]
  );

  const deleteActivity = useCallback(
    (id: string) => {
      persistActivities(removeActivityRecord(snapshot.activities, id));
    },
    [snapshot.activities, persistActivities]
  );

  const clearActivities = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.activities);
    } catch {
      // ignore storage quota failures
    }
    emitStoreChange();
  }, []);

  const activitySummary = useMemo(
    () => summarizeActivities(snapshot.activities, clientNow),
    [snapshot.activities, clientNow]
  );

  const recommendationFingerprint = useMemo(
    () =>
      computeRecommendationFingerprint(
        activeLocation,
        snapshot.profile,
        snapshot.locale
      ),
    [activeLocation, snapshot.profile, snapshot.locale]
  );

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      locale: snapshot.locale,
      theme: snapshot.theme,
      selectedCityId: activeLocation.id,
      selectedLocation: activeLocation,
      recentLocations: snapshot.recentLocations,
      profile: snapshot.profile,
      activities: snapshot.activities,
      activitySummary,
      recommendationFingerprint,
      dict: APP_DICTIONARY[snapshot.locale],
      phase04Dict: PHASE04_DICTIONARY[snapshot.locale],
      setLocale,
      toggleLocale,
      setTheme,
      toggleTheme,
      setSelectedCityId,
      selectLocation,
      saveProfile,
      resetProfile,
      deleteAllLocalData,
      logActivity,
      editActivity,
      deleteActivity,
      clearActivities,
      addToast,
    }),
    [
      snapshot,
      activeLocation,
      activitySummary,
      recommendationFingerprint,
      setLocale,
      toggleLocale,
      setTheme,
      toggleTheme,
      setSelectedCityId,
      selectLocation,
      saveProfile,
      resetProfile,
      deleteAllLocalData,
      logActivity,
      editActivity,
      deleteActivity,
      clearActivities,
      addToast,
    ]
  );

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <AppPreferencesContext.Provider value={value}>
          <PwaAndOfflineBar locale={snapshot.locale} />
          {children}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="print:hidden pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-full sm:max-w-sm"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="status"
                className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  {toast.tone === "info" ? (
                    <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  )}
                  <span>{toast.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </AppPreferencesContext.Provider>
      </TooltipProvider>
    </MotionConfig>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error("useAppPreferences must be used inside <AppProviders />");
  }
  return ctx;
}
