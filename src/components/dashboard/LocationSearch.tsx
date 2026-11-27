"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/button";
import { DEMO_LOCATIONS } from "@/lib/demo/air-quality-demo";
import { cn } from "@/lib/utils";
import type { GeoLocation } from "@/types/domain";

interface LocationSearchProps {
  onSelectLocation: (
    location: GeoLocation,
    options?: { persistPreference?: boolean }
  ) => void;
}

const FEATURED_GLOBAL: readonly GeoLocation[] = [
  ...DEMO_LOCATIONS,
  {
    id: "om-noida",
    name: "Noida",
    region: "Uttar Pradesh",
    country: "India",
    countryCode: "IN",
    latitude: 28.5355,
    longitude: 77.391,
    timezone: "Asia/Kolkata",
  },
  {
    id: "om-lucknow",
    name: "Lucknow",
    region: "Uttar Pradesh",
    country: "India",
    countryCode: "IN",
    latitude: 26.8467,
    longitude: 80.9462,
    timezone: "Asia/Kolkata",
  },
  {
    id: "om-london",
    name: "London",
    region: "England",
    country: "United Kingdom",
    countryCode: "GB",
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "Europe/London",
  },
  {
    id: "om-newyork",
    name: "New York",
    region: "New York",
    country: "United States",
    countryCode: "US",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
  },
];

export function LocationSearch({ onSelectLocation }: LocationSearchProps) {
  const { dict, recentLocations, addToast } = useAppPreferences();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal }
        );
        const body = (await res.json()) as {
          ok: boolean;
          results?: GeoLocation[];
          message?: string;
        };
        if (!res.ok || !body.ok) {
          setSearchError(body.message ?? dict.dashboard.searchError);
          setResults([]);
        } else {
          setResults(body.results ?? []);
          setActiveIndex(-1);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSearchError(dict.dashboard.searchError);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, dict.dashboard.searchError]);

  const displayedList =
    query.trim().length >= 2
      ? results
      : recentLocations.length > 0
        ? recentLocations
        : FEATURED_GLOBAL.slice(0, 6);

  const choose = (loc: GeoLocation) => {
    onSelectLocation(loc, { persistPreference: true });
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        displayedList.length === 0 ? -1 : (prev + 1) % displayedList.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        displayedList.length === 0
          ? -1
          : (prev - 1 + displayedList.length) % displayedList.length
      );
    } else if (e.key === "Enter" && activeIndex >= 0 && displayedList[activeIndex]) {
      e.preventDefault();
      choose(displayedList[activeIndex]);
    }
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      addToast("Geolocation is not supported in this browser.", "info");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const loc: GeoLocation = {
          id: `geo-${lat}-${lon}`,
          name: `Current Coordinates (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
          country: "Detected Location",
          countryCode: "XX",
          latitude: lat,
          longitude: lon,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "auto",
          isCurrentCoordinates: true,
        };
        onSelectLocation(loc, { persistPreference: false });
        addToast("Loaded modeled air quality for your detected coordinates.");
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Select a city manually instead."
            : err.code === err.TIMEOUT
              ? "Location detection timed out. Please try again or pick a city."
              : "Current location is unavailable right now.";
        addToast(msg, "info");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 }
    );
  };

  return (
    <div ref={containerRef} className="relative flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          data-slot="input"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="city-search-listbox"
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `city-option-${activeIndex}` : undefined
          }
          aria-label={dict.dashboard.searchLabel}
          placeholder={dict.dashboard.searchPlaceholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(true);
            if (val.trim().length < 2) {
              setResults([]);
              setSearchError(null);
              setLoading(false);
            }
          }}
          onKeyDown={handleKeyDown}
          className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent pl-9 pr-8 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}

        {isOpen ? (
          <div
            id="city-search-listbox"
            role="listbox"
            className="absolute top-full right-0 left-0 z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
          >
            <p className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {query.trim().length >= 2
                ? loading
                  ? dict.dashboard.searchingLabel
                  : "Open-Meteo Geocoding · GeoNames"
                : dict.dashboard.recentCitiesLabel}
            </p>

            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                <span>{dict.dashboard.searchingLabel}</span>
              </div>
            ) : searchError ? (
              <p className="px-3 py-2.5 text-xs text-destructive">{searchError}</p>
            ) : displayedList.length === 0 && query.trim().length >= 2 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                {dict.dashboard.noSearchResults}
              </p>
            ) : (
              displayedList.map((loc, idx) => (
                <button
                  key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                  id={`city-option-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  onClick={() => choose(loc)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                    idx === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate font-medium">{loc.name}</span>
                    <span className="truncate text-muted-foreground">
                      {[loc.region, loc.country].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {loc.countryCode}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleUseMyLocation}
        disabled={locating}
        className="h-9 shrink-0 gap-1.5"
      >
        {locating ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="size-3.5 text-primary" aria-hidden="true" />
        )}
        <span>
          {locating ? dict.dashboard.locatingLabel : dict.dashboard.useMyLocation}
        </span>
      </Button>
    </div>
  );
}
