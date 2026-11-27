import {
  determineDominantPollutant,
  evaluateDataFreshness,
} from "@/lib/air-quality/intelligence";
import {
  dedupeInflight,
  getCachedEntry,
  setCachedEntry,
} from "@/lib/cache/memory-cache";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import {
  openMeteoAirQualityResponseSchema,
  openMeteoGeocodingResponseSchema,
} from "@/lib/schemas";
import type {
  AirQualityService,
  GeocodingService,
} from "@/services/air-quality/types";
import type {
  AirQualityForecast,
  AirQualityPoint,
  GeoLocation,
  PollutantUnits,
  UsAqiSubindices,
} from "@/types/domain";

const OPEN_METEO_AQ_ENDPOINT =
  "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_GEO_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/search";

export const AQ_CACHE_TTL_MS = 12 * 60 * 1000; // 12 minutes
export const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const CITY_QUERY_ALIASES: Record<string, string> = {
  delhi: "New Delhi",
  bangalore: "Bengaluru",
  gurgaon: "Gurugram",
  bombay: "Mumbai",
  calcutta: "Kolkata",
  madras: "Chennai",
  benares: "Varanasi",
  banaras: "Varanasi",
  poona: "Pune",
  trivandrum: "Thiruvananthapuram",
};

export class UpstreamApiError extends Error {
  readonly statusCode: number;
  readonly code: "RATE_LIMITED" | "TIMEOUT" | "UPSTREAM_ERROR" | "VALIDATION_ERROR";

  constructor(
    message: string,
    statusCode: number,
    code: UpstreamApiError["code"]
  ) {
    super(message);
    this.name = "UpstreamApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Formats an Open-Meteo naive local timestamp (`YYYY-MM-DDTHH:mm`) with its
 * explicit UTC offset (`utc_offset_seconds`) so JS `Date` parsing is unambiguous,
 * including across DST or half-hour timezone boundaries.
 */
export function toOffsetIsoTimestamp(
  localIsoWithoutZone: string,
  utcOffsetSeconds: number
): string {
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(localIsoWithoutZone)) {
    return localIsoWithoutZone;
  }

  const normalizedBase =
    localIsoWithoutZone.length === 16
      ? `${localIsoWithoutZone}:00`
      : localIsoWithoutZone;

  if (utcOffsetSeconds === 0) {
    return `${normalizedBase}Z`;
  }

  const sign = utcOffsetSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(Math.round(utcOffsetSeconds));
  const hours = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mins = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");

  return `${normalizedBase}${sign}${hours}:${mins}`;
}

function coalesceNull(val: number | null | undefined): number | null {
  return val === undefined || val === null || !Number.isFinite(val) ? null : val;
}

async function fetchJsonWithResilience(
  url: string,
  externalSignal?: AbortSignal
): Promise<unknown> {
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new UpstreamApiError("Request cancelled", 499, "TIMEOUT");
      }
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          await new Promise((r) => setTimeout(r, 250 * attempt));
          continue;
        }
        throw new UpstreamApiError(
          "Open-Meteo rate limit exceeded. Please try again shortly.",
          429,
          "RATE_LIMITED"
        );
      }

      if (response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          await new Promise((r) => setTimeout(r, 200 * attempt));
          continue;
        }
        throw new UpstreamApiError(
          `Open-Meteo upstream error (${response.status})`,
          502,
          "UPSTREAM_ERROR"
        );
      }

      if (!response.ok) {
        throw new UpstreamApiError(
          `Open-Meteo returned HTTP ${response.status}`,
          response.status,
          "UPSTREAM_ERROR"
        );
      }

      return await response.json();
    } catch (err) {
      if (err instanceof UpstreamApiError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new UpstreamApiError(
          "Upstream air quality request timed out.",
          504,
          "TIMEOUT"
        );
      }
      if (attempt < MAX_RETRIES) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      throw new UpstreamApiError(
        "Unable to reach Open-Meteo service.",
        503,
        "UPSTREAM_ERROR"
      );
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    }
  }

  throw new UpstreamApiError("Exhausted upstream retries.", 503, "UPSTREAM_ERROR");
}

export function normalizeOpenMeteoAirQuality(
  rawPayload: unknown,
  location: GeoLocation,
  fetchedAtIso: string = new Date().toISOString()
): AirQualityForecast {
  const parsed = openMeteoAirQualityResponseSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new UpstreamApiError(
      "Unexpected Open-Meteo air quality response schema.",
      502,
      "VALIDATION_ERROR"
    );
  }

  const data = parsed.data;
  const offset = data.utc_offset_seconds ?? 0;
  const resolvedTimezone =
    data.timezone && data.timezone !== "GMT"
      ? data.timezone
      : location.timezone || data.timezone || "UTC";

  const units: PollutantUnits = {
    pm25: data.current_units?.pm2_5 ?? data.hourly_units?.pm2_5 ?? "µg/m³",
    pm10: data.current_units?.pm10 ?? data.hourly_units?.pm10 ?? "µg/m³",
    no2:
      data.current_units?.nitrogen_dioxide ??
      data.hourly_units?.nitrogen_dioxide ??
      "µg/m³",
    o3: data.current_units?.ozone ?? data.hourly_units?.ozone ?? "µg/m³",
    so2:
      data.current_units?.sulphur_dioxide ??
      data.hourly_units?.sulphur_dioxide ??
      "µg/m³",
    co:
      data.current_units?.carbon_monoxide ??
      data.hourly_units?.carbon_monoxide ??
      "µg/m³",
  };

  const currentSubindices: UsAqiSubindices = {
    pm25: coalesceNull(data.current?.us_aqi_pm2_5),
    pm10: coalesceNull(data.current?.us_aqi_pm10),
    no2: coalesceNull(data.current?.us_aqi_nitrogen_dioxide),
    o3: coalesceNull(data.current?.us_aqi_ozone),
    so2: coalesceNull(data.current?.us_aqi_sulphur_dioxide),
    co: coalesceNull(data.current?.us_aqi_carbon_monoxide),
  };

  const currentTimestampIso = data.current?.time
    ? toOffsetIsoTimestamp(data.current.time, offset)
    : fetchedAtIso;

  const current: AirQualityPoint = {
    timestampIso: currentTimestampIso,
    usAqi: coalesceNull(data.current?.us_aqi),
    europeanAqi: null,
    pollutants: {
      pm25: coalesceNull(data.current?.pm2_5),
      pm10: coalesceNull(data.current?.pm10),
      no2: coalesceNull(data.current?.nitrogen_dioxide),
      o3: coalesceNull(data.current?.ozone),
      so2: coalesceNull(data.current?.sulphur_dioxide),
      co: coalesceNull(data.current?.carbon_monoxide),
    },
    subindices: currentSubindices,
  };

  const hourlyTimes = data.hourly?.time ?? [];
  const allHourly: AirQualityPoint[] = hourlyTimes.map((timeStr, idx) => ({
    timestampIso: toOffsetIsoTimestamp(timeStr, offset),
    usAqi: coalesceNull(data.hourly?.us_aqi?.[idx]),
    europeanAqi: null,
    pollutants: {
      pm25: coalesceNull(data.hourly?.pm2_5?.[idx]),
      pm10: coalesceNull(data.hourly?.pm10?.[idx]),
      no2: coalesceNull(data.hourly?.nitrogen_dioxide?.[idx]),
      o3: coalesceNull(data.hourly?.ozone?.[idx]),
      so2: coalesceNull(data.hourly?.sulphur_dioxide?.[idx]),
      co: coalesceNull(data.hourly?.carbon_monoxide?.[idx]),
    },
    subindices: {
      pm25: coalesceNull(data.hourly?.us_aqi_pm2_5?.[idx]),
      pm10: coalesceNull(data.hourly?.us_aqi_pm10?.[idx]),
      no2: coalesceNull(data.hourly?.us_aqi_nitrogen_dioxide?.[idx]),
      o3: coalesceNull(data.hourly?.us_aqi_ozone?.[idx]),
      so2: coalesceNull(data.hourly?.us_aqi_sulphur_dioxide?.[idx]),
      co: coalesceNull(data.hourly?.us_aqi_carbon_monoxide?.[idx]),
    },
  }));

  // Keep upcoming 48 hours starting from the current model local hour floor
  // (accounting for half-hour/quarter-hour offsets such as +05:30)
  const currentMs = Date.parse(currentTimestampIso);
  const offsetMs = offset * 1000;
  const currentHourFloorMs = Number.isFinite(currentMs)
    ? Math.floor((currentMs + offsetMs) / 3_600_000) * 3_600_000 - offsetMs
    : 0;
  const upcomingHourly = allHourly.filter((pt) => {
    const ptMs = Date.parse(pt.timestampIso);
    return Number.isFinite(ptMs) ? ptMs >= currentHourFloorMs : true;
  });
  const hourly = (upcomingHourly.length > 0 ? upcomingHourly : allHourly).slice(
    0,
    48
  );

  const dominant = determineDominantPollutant(currentSubindices);

  return {
    location: {
      ...location,
      timezone: resolvedTimezone,
    },
    current,
    hourly,
    units,
    utcOffsetSeconds: offset,
    dominantPollutant: dominant.dominantPollutant,
    dominantPollutantReason: dominant.reasonEn,
    provenance: {
      sourceName: "Open-Meteo / CAMS",
      sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      attributionLabel: "Current modeled air quality — Open-Meteo / CAMS",
      dataSourceType: "modeled",
      aqiStandard: "US_AQI",
      aqiStandardNote:
        "Modeled US EPA AQI via Open-Meteo / CAMS — distinct from official Indian CPCB NAQI ground stations.",
      modelTimestampIso: currentTimestampIso,
      fetchedAtIso,
      lastSuccessfulFetchIso: fetchedAtIso,
      cacheAgeSeconds: 0,
      freshnessStatus: "fresh",
      isStale: false,
    },
  };
}

export function normalizeLocationQuery(rawQuery: string): string {
  const trimmed = rawQuery.trim();
  const alias = CITY_QUERY_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

export class OpenMeteoAirQualityService implements AirQualityService {
  async getForecast(
    location: GeoLocation,
    options?: {
      forecastDays?: number;
      bypassCache?: boolean;
      signal?: AbortSignal;
    }
  ): Promise<AirQualityForecast> {
    const requestedDays = options?.forecastDays ?? 3;
    // Request at least 3 calendar UTC days whenever multi-day (48h) outlook is needed,
    // because slicing from the current hour floor mid-day otherwise yields <48 upcoming hours.
    const days = requestedDays >= 2 ? Math.max(requestedDays, 3) : requestedDays;
    const cacheKey = `aq:${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}:d${days}`;
    const cached = getCachedEntry<AirQualityForecast>(cacheKey);

    if (!options?.bypassCache && cached.hit && !cached.isStale && cached.value) {
      const freshness = evaluateDataFreshness(cached.value.provenance.fetchedAtIso);
      return {
        ...cached.value,
        location: { ...location, timezone: cached.value.location.timezone },
        provenance: {
          ...cached.value.provenance,
          dataSourceType: "cached",
          attributionLabel: "Cached modeled air quality — Open-Meteo / CAMS",
          cacheAgeSeconds: cached.ageSeconds,
          freshnessStatus: freshness.isStale ? "stale" : "cached",
          isStale: freshness.isStale,
        },
      };
    }

    const params = new URLSearchParams({
      latitude: location.latitude.toFixed(4),
      longitude: location.longitude.toFixed(4),
      current: [
        "us_aqi",
        "us_aqi_pm2_5",
        "us_aqi_pm10",
        "us_aqi_nitrogen_dioxide",
        "us_aqi_ozone",
        "us_aqi_sulphur_dioxide",
        "us_aqi_carbon_monoxide",
        "pm2_5",
        "pm10",
        "nitrogen_dioxide",
        "ozone",
        "sulphur_dioxide",
        "carbon_monoxide",
      ].join(","),
      hourly: [
        "us_aqi",
        "us_aqi_pm2_5",
        "us_aqi_pm10",
        "pm2_5",
        "pm10",
        "nitrogen_dioxide",
        "ozone",
        "sulphur_dioxide",
        "carbon_monoxide",
      ].join(","),
      forecast_days: String(days),
      timezone: "GMT",
    });

    const url = `${OPEN_METEO_AQ_ENDPOINT}?${params.toString()}`;

    try {
      const normalized = await dedupeInflight(cacheKey, async () => {
        const json = await fetchJsonWithResilience(url, options?.signal);
        return normalizeOpenMeteoAirQuality(json, location);
      });

      setCachedEntry(cacheKey, normalized, AQ_CACHE_TTL_MS);
      return normalized;
    } catch (err) {
      if (cached.hit && cached.value) {
        return {
          ...cached.value,
          location: { ...location, timezone: cached.value.location.timezone },
          provenance: {
            ...cached.value.provenance,
            dataSourceType: "stale",
            attributionLabel: "Stale modeled air quality — Open-Meteo / CAMS",
            cacheAgeSeconds: cached.ageSeconds,
            freshnessStatus: "stale",
            isStale: true,
          },
        };
      }
      throw err;
    }
  }

  getDemonstrationFallback(location: GeoLocation): AirQualityForecast {
    const demo = getDemoForecast(location.id);
    return {
      ...demo,
      location,
    };
  }
}

export class OpenMeteoGeocodingService implements GeocodingService {
  async searchLocations(
    query: string,
    limit: number = 8,
    signal?: AbortSignal
  ): Promise<GeoLocation[]> {
    const normalizedQuery = normalizeLocationQuery(query);
    if (normalizedQuery.length < 2) return [];

    const cacheKey = `geo:${normalizedQuery.toLowerCase()}:${limit}`;
    const cached = getCachedEntry<GeoLocation[]>(cacheKey);
    if (cached.hit && !cached.isStale && cached.value) {
      return cached.value;
    }

    const params = new URLSearchParams({
      name: normalizedQuery,
      count: String(Math.min(15, Math.max(1, limit))),
      language: "en",
      format: "json",
    });

    const url = `${OPEN_METEO_GEO_ENDPOINT}?${params.toString()}`;
    const raw = await dedupeInflight(cacheKey, () =>
      fetchJsonWithResilience(url, signal)
    );

    const parsed = openMeteoGeocodingResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new UpstreamApiError(
        "Unexpected Open-Meteo geocoding response schema.",
        502,
        "VALIDATION_ERROR"
      );
    }

    const mapped: GeoLocation[] = (parsed.data.results ?? []).map((r) => ({
      id: `om-${r.id}`,
      name: r.name,
      region: r.admin1 || r.admin2,
      country: r.country ?? r.country_code ?? "Unknown",
      countryCode: (r.country_code ?? "XX").toUpperCase(),
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? "UTC",
      population: r.population,
    }));

    // Prioritize Indian cities mildly when relevance ties, while preserving global results
    const sorted = [...mapped].sort((a, b) => {
      const aExact = a.name.toLowerCase() === normalizedQuery.toLowerCase() ? 1 : 0;
      const bExact = b.name.toLowerCase() === normalizedQuery.toLowerCase() ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      const aIn = a.countryCode === "IN" ? 1 : 0;
      const bIn = b.countryCode === "IN" ? 1 : 0;
      if (aIn !== bIn && Math.abs((b.population ?? 0) - (a.population ?? 0)) < 2_000_000) {
        return bIn - aIn;
      }

      return (b.population ?? 0) - (a.population ?? 0);
    });

    setCachedEntry(cacheKey, sorted, GEO_CACHE_TTL_MS);
    return sorted;
  }
}

export const openMeteoAirQualityService = new OpenMeteoAirQualityService();
export const openMeteoGeocodingService = new OpenMeteoGeocodingService();
