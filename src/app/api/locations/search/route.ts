import { connection, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/cache/memory-cache";
import { locationSearchQuerySchema } from "@/lib/schemas";
import {
  openMeteoGeocodingService,
  UpstreamApiError,
} from "@/services/air-quality/open-meteo";

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
  const rate = checkRateLimit(`geo:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    return Response.json(
      {
        ok: false,
        errorCode: "RATE_LIMITED",
        message: "Too many location search requests. Please wait briefly.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = locationSearchQuerySchema.safeParse({
    q: sp.get("q") ?? "",
    limit: sp.get("limit") ?? 8,
  });

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errorCode: "INVALID_QUERY",
        message:
          parsed.error.issues[0]?.message ??
          "Search query must be between 2 and 80 characters.",
      },
      { status: 400 }
    );
  }

  try {
    const results = await openMeteoGeocodingService.searchLocations(
      parsed.data.q,
      parsed.data.limit,
      request.signal
    );

    return Response.json(
      {
        ok: true,
        results,
        attribution: "Open-Meteo Geocoding API & GeoNames",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600",
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
        message: "Location search is temporarily unavailable.",
      },
      { status: 503 }
    );
  }
}
