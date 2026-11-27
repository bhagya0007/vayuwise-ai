"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import type { AirQualityForecast, GeoLocation } from "@/types/domain";

interface UseAirQualityForecastOptions {
  forecastDays?: 1 | 2 | 3;
  unavailableFallbackMessage?: string;
  onRefreshed?: () => void;
}

interface FetchForecastResult {
  ok: boolean;
  aborted?: boolean;
  forecast?: AirQualityForecast | null;
  errorMessage?: string;
}

async function fetchForecastPayload(
  loc: GeoLocation,
  forecastDays: 1 | 2 | 3,
  unavailableFallbackMessage: string,
  opts: { bypassCache?: boolean; signal?: AbortSignal } = {}
): Promise<FetchForecastResult> {
  const params = new URLSearchParams({
    lat: String(loc.latitude),
    lon: String(loc.longitude),
    name: loc.name,
    country: loc.country,
    countryCode: loc.countryCode,
    timezone: loc.timezone || "auto",
    forecastDays: String(forecastDays),
  });
  if (loc.region) params.set("region", loc.region);
  if (opts.bypassCache) params.set("refresh", "1");

  try {
    const res = await fetch(`/api/air-quality?${params.toString()}`, {
      signal: opts.signal,
    });
    const body = (await res.json()) as {
      ok: boolean;
      forecast?: AirQualityForecast;
      message?: string;
    };

    if (opts.signal?.aborted) {
      return { ok: false, aborted: true };
    }

    if (!res.ok || !body.ok || !body.forecast) {
      return {
        ok: false,
        forecast: null,
        errorMessage: body.message ?? unavailableFallbackMessage,
      };
    }

    return { ok: true, forecast: body.forecast };
  } catch (err) {
    if ((err as Error).name === "AbortError" || opts.signal?.aborted) {
      return { ok: false, aborted: true };
    }
    return {
      ok: false,
      forecast: null,
      errorMessage: unavailableFallbackMessage,
    };
  }
}

/**
 * Shared client hook for loading modeled Open-Meteo forecasts via `/api/air-quality`
 * with abort safety, manual refresh, explicit demo fallback, and key-based stale checks.
 */
export function useAirQualityForecast(
  location: GeoLocation,
  options: UseAirQualityForecastOptions = {}
) {
  const {
    forecastDays = 3,
    unavailableFallbackMessage = "Live air quality data is currently unavailable.",
    onRefreshed,
  } = options;

  const [forecast, setForecast] = useState<AirQualityForecast | null>(null);
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [demoOverride, setDemoOverride] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const activeKey = `${location.id}:${location.latitude}:${location.longitude}:${forecastDays}`;
  const loading = !demoOverride && fetchedKey !== activeKey && !apiError;

  const applyFetchResult = useCallback(
    (
      locKey: string,
      result: FetchForecastResult,
      isRefresh?: boolean
    ) => {
      if (result.aborted) {
        setRefreshing(false);
        return;
      }
      if (!result.ok || !result.forecast) {
        setForecast(null);
        setApiError(result.errorMessage ?? unavailableFallbackMessage);
      } else {
        setForecast(result.forecast);
        setApiError(null);
        if (isRefresh) {
          onRefreshed?.();
        }
      }
      setFetchedKey(locKey);
      setRefreshing(false);
    },
    [unavailableFallbackMessage, onRefreshed]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchForecastPayload(location, forecastDays, unavailableFallbackMessage, {
      signal: controller.signal,
    }).then((result) => {
      if (!controller.signal.aborted) {
        applyFetchResult(activeKey, result);
      }
    });

    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, [location, forecastDays, unavailableFallbackMessage, activeKey, applyFetchResult]);

  const reload = useCallback(
    (opts: { bypassCache?: boolean; isRefresh?: boolean } = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (opts.isRefresh) {
        setRefreshing(true);
      }
      setApiError(null);
      setDemoOverride(false);
      void fetchForecastPayload(location, forecastDays, unavailableFallbackMessage, {
        bypassCache: opts.bypassCache,
        signal: controller.signal,
      }).then((result) => {
        if (!controller.signal.aborted) {
          applyFetchResult(activeKey, result, opts.isRefresh);
        }
      });
    },
    [location, forecastDays, unavailableFallbackMessage, activeKey, applyFetchResult]
  );

  const enableDemoMode = useCallback(() => {
    setDemoOverride(true);
    setApiError(null);
  }, []);

  const clearOverridesForLocationSwitch = useCallback(() => {
    setApiError(null);
    setDemoOverride(false);
  }, []);

  const activeForecast: AirQualityForecast | null = useMemo(() => {
    if (demoOverride) {
      return {
        ...getDemoForecast(location.id),
        location,
      };
    }
    return forecast;
  }, [demoOverride, forecast, location]);

  return {
    activeForecast,
    loading,
    refreshing,
    apiError,
    demoOverride,
    reload,
    enableDemoMode,
    clearOverridesForLocationSwitch,
  };
}
