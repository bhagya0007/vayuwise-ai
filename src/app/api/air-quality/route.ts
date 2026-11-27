import { connection, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/cache/memory-cache";
import { airQualityQuerySchema } from "@/lib/schemas";
import {
  openMeteoAirQualityService,
  UpstreamApiError,
} from "@/services/air-quality/open-meteo";
import type { GeoLocation } from "@/types/domain";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") ?? "local";
}

export async function GET(request: NextRequest) {
  await connection();

  const ip = getClientIp(request);
  const rate = checkRateLimit(`aq:${ip}`, 40, 60_000);
  if (!rate.allowed) {
    return Response.json(
      {
        ok: false,
        errorCode: "RATE_LIMITED",
        message: "Too many air quality requests. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = airQualityQuerySchema.safeParse({
    lat: sp.get("lat"),
    lon: sp.get("lon"),
    name: sp.get("name") ?? undefined,
    region: sp.get("region") ?? undefined,
    country: sp.get("country") ?? undefined,
    countryCode: sp.get("countryCode") ?? undefined,
    timezone: sp.get("timezone") ?? "auto",
    forecastDays: sp.get("forecastDays") ?? 3,
    refresh: sp.get("refresh") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errorCode: "INVALID_PARAMETERS",
        message:
          parsed.error.issues[0]?.message ??
          "Invalid coordinates or query parameters.",
      },
      { status: 400 }
    );
  }

  const {
    lat,
    lon,
    name,
    region,
    country,
    countryCode,
    timezone,
    forecastDays,
    refresh,
  } = parsed.data;

  const isBypass = refresh === "1" || refresh === "true";

  const location: GeoLocation = {
    id: `coord-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name: name ?? `Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
    region,
    country: country ?? "Detected Coordinates",
    countryCode: countryCode?.toUpperCase() ?? "XX",
    latitude: lat,
    longitude: lon,
    timezone,
    isCurrentCoordinates: !name,
  };

  try {
    const forecast = await openMeteoAirQualityService.getForecast(location, {
      forecastDays,
      bypassCache: isBypass,
      signal: request.signal,
    });

    return Response.json(
      {
        ok: true,
        forecast,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": isBypass ? "no-store" : "private, max-age=300",
        },
      }
    );
  } catch (err) {
    if (err instanceof UpstreamApiError) {
      return Response.json(
        {
          ok: false,
          errorCode: err.code,
          message: err.message,
        },
        { status: err.statusCode }
      );
    }

    return Response.json(
      {
        ok: false,
        errorCode: "UPSTREAM_ERROR",
        message: "Unable to retrieve modeled air quality data right now.",
      },
      { status: 503 }
    );
  }
}
