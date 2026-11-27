import type { AirQualityForecast, GeoLocation } from "@/types/domain";

export interface GeocodingService {
  searchLocations(query: string, limit?: number): Promise<GeoLocation[]>;
}

export interface AirQualityService {
  getForecast(location: GeoLocation): Promise<AirQualityForecast>;
  getDemonstrationFallback(location: GeoLocation): AirQualityForecast;
}
