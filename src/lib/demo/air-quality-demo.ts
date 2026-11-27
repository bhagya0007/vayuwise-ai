import type {
  AirQualityForecast,
  AirQualityPoint,
  GeoLocation,
  Locale,
  PollutantSnapshot,
} from "@/types/domain";

export const DEMO_BANNER_COPY: Record<Locale, string> = {
  en: "Demo Data — Not Current Air Quality Readings",
  hi: "डेमो डेटा — वर्तमान वास्तविक वायु गुणवत्ता रीडिंग नहीं",
};

export const DEMO_LOCATIONS: readonly GeoLocation[] = [
  {
    id: "new-delhi",
    name: "New Delhi",
    region: "Delhi NCR",
    country: "India",
    countryCode: "IN",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
  {
    id: "gurugram",
    name: "Gurugram",
    region: "Haryana",
    country: "India",
    countryCode: "IN",
    latitude: 28.4595,
    longitude: 77.0266,
    timezone: "Asia/Kolkata",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    countryCode: "IN",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    region: "Karnataka",
    country: "India",
    countryCode: "IN",
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: "Asia/Kolkata",
  },
  {
    id: "kolkata",
    name: "Kolkata",
    region: "West Bengal",
    country: "India",
    countryCode: "IN",
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: "Asia/Kolkata",
  },
  {
    id: "patna",
    name: "Patna",
    region: "Bihar",
    country: "India",
    countryCode: "IN",
    latitude: 25.5941,
    longitude: 85.1376,
    timezone: "Asia/Kolkata",
  },
] as const;

export const DEFAULT_DEMO_CITY_ID = "new-delhi";

interface DemoCitySeed {
  baseUsAqi: number;
  baseEaqi: number;
  dominantPollutant: keyof PollutantSnapshot;
  pollutants: PollutantSnapshot;
  hourlyCurve: number[];
}

const CITY_SEEDS: Record<string, DemoCitySeed> = {
  "new-delhi": {
    baseUsAqi: 248,
    baseEaqi: 132,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 168.4,
      pm10: 254.0,
      no2: 64.2,
      o3: 38.5,
      so2: 19.4,
      co: 1.85,
    },
    hourlyCurve: [
      268, 274, 279, 282, 285, 288, 280, 266, 248, 224, 198, 178,
      166, 158, 154, 162, 176, 198, 226, 244, 256, 262, 265, 267,
    ],
  },
  gurugram: {
    baseUsAqi: 226,
    baseEaqi: 121,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 149.2,
      pm10: 228.6,
      no2: 58.1,
      o3: 41.0,
      so2: 16.8,
      co: 1.62,
    },
    hourlyCurve: [
      242, 248, 251, 255, 258, 254, 244, 232, 226, 202, 176, 158,
      146, 138, 135, 144, 158, 178, 204, 220, 231, 236, 239, 241,
    ],
  },
  mumbai: {
    baseUsAqi: 124,
    baseEaqi: 72,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 44.8,
      pm10: 88.2,
      no2: 39.6,
      o3: 54.0,
      so2: 14.2,
      co: 0.92,
    },
    hourlyCurve: [
      138, 142, 144, 141, 136, 132, 128, 125, 124, 114, 102, 92,
      86, 82, 80, 86, 94, 104, 118, 126, 132, 135, 137, 138,
    ],
  },
  bengaluru: {
    baseUsAqi: 78,
    baseEaqi: 46,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 24.6,
      pm10: 51.4,
      no2: 29.4,
      o3: 48.2,
      so2: 8.6,
      co: 0.64,
    },
    hourlyCurve: [
      88, 91, 90, 86, 82, 79, 78, 76, 78, 72, 65, 58,
      54, 52, 50, 54, 62, 72, 82, 86, 88, 89, 88, 87,
    ],
  },
  kolkata: {
    baseUsAqi: 186,
    baseEaqi: 104,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 108.5,
      pm10: 174.0,
      no2: 52.3,
      o3: 42.1,
      so2: 17.5,
      co: 1.38,
    },
    hourlyCurve: [
      202, 208, 212, 216, 214, 206, 196, 188, 186, 168, 152, 138,
      128, 122, 120, 128, 142, 160, 182, 194, 200, 204, 205, 204,
    ],
  },
  patna: {
    baseUsAqi: 234,
    baseEaqi: 126,
    dominantPollutant: "pm25",
    pollutants: {
      pm25: 156.0,
      pm10: 238.5,
      no2: 49.0,
      o3: 36.8,
      so2: 15.4,
      co: 1.54,
    },
    hourlyCurve: [
      250, 256, 260, 264, 262, 255, 246, 238, 234, 210, 186, 166,
      154, 146, 144, 152, 168, 188, 214, 230, 242, 246, 248, 249,
    ],
  },
};

const DEMO_SNAPSHOT_ISO = "2026-11-26T08:00:00+05:30";

export function getDemoLocationById(cityId: string): GeoLocation {
  return (
    DEMO_LOCATIONS.find((city) => city.id === cityId) ?? DEMO_LOCATIONS[0]
  );
}

export function getDemoForecast(cityId: string): AirQualityForecast & {
  dominantPollutant: keyof PollutantSnapshot;
} {
  const location = getDemoLocationById(cityId);
  const seed = CITY_SEEDS[location.id] ?? CITY_SEEDS[DEFAULT_DEMO_CITY_ID];
  const baseDate = new Date("2026-11-26T00:00:00+05:30");

  const hourly: AirQualityPoint[] = seed.hourlyCurve.map((aqi, hourIdx) => {
    const pointDate = new Date(baseDate.getTime() + hourIdx * 3600 * 1000);
    const ratio = aqi / seed.baseUsAqi;
    return {
      timestampIso: pointDate.toISOString(),
      usAqi: aqi,
      europeanAqi: Math.round(seed.baseEaqi * ratio),
      pollutants: {
        pm25: seed.pollutants.pm25 ? Number((seed.pollutants.pm25 * ratio).toFixed(1)) : null,
        pm10: seed.pollutants.pm10 ? Number((seed.pollutants.pm10 * ratio).toFixed(1)) : null,
        no2: seed.pollutants.no2 ? Number((seed.pollutants.no2 * ratio).toFixed(1)) : null,
        o3: seed.pollutants.o3 ? Number((seed.pollutants.o3 * ratio).toFixed(1)) : null,
        so2: seed.pollutants.so2 ? Number((seed.pollutants.so2 * ratio).toFixed(1)) : null,
        co: seed.pollutants.co ? Number((seed.pollutants.co * 1000 * ratio).toFixed(0)) : null,
      },
    };
  });

  return {
    location,
    dominantPollutant: seed.dominantPollutant,
    dominantPollutantReason:
      "Illustrative demonstration subindex leader (PM₂.₅) — not a live measurement.",
    units: {
      pm25: "µg/m³",
      pm10: "µg/m³",
      no2: "µg/m³",
      o3: "µg/m³",
      so2: "µg/m³",
      co: "µg/m³",
    },
    utcOffsetSeconds: 19800,
    current: {
      timestampIso: DEMO_SNAPSHOT_ISO,
      usAqi: seed.baseUsAqi,
      europeanAqi: seed.baseEaqi,
      pollutants: {
        ...seed.pollutants,
        co: seed.pollutants.co ? Math.round(seed.pollutants.co * 1000) : null,
      },
      subindices: {
        pm25: seed.baseUsAqi,
        pm10: Math.round(seed.baseUsAqi * 0.62),
        no2: Math.round(seed.baseUsAqi * 0.28),
        o3: Math.round(seed.baseUsAqi * 0.2),
        so2: Math.round(seed.baseUsAqi * 0.14),
        co: Math.round(seed.baseUsAqi * 0.1),
      },
    },
    hourly,
    provenance: {
      sourceName: "VayuWise Demonstration Dataset",
      sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      attributionLabel: "Demo Data — Not Current Air Quality Readings",
      dataSourceType: "demonstration",
      aqiStandard: "US_AQI",
      aqiStandardNote:
        "Illustrative US AQI values for UI demonstration only (distinct from official Indian CPCB NAQI).",
      modelTimestampIso: DEMO_SNAPSHOT_ISO,
      fetchedAtIso: DEMO_SNAPSHOT_ISO,
      freshnessStatus: "demonstration",
      isStale: true,
    },
  };
}
