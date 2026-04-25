import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;  // Human-readable address
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  durationText: string;
}

/**
 * Google Maps Platform integration.
 * Used for:
 *  1. Pickup / drop-off location autocomplete
 *  2. Distance calculation between locations (for delivery fee logic)
 *  3. Geocoding addresses to coordinates
 *
 * Restrict your API key in Google Cloud Console:
 *   - APIs: Places API, Geocoding API, Distance Matrix API
 *   - HTTP referrers: your domain(s)
 *   - For server-side calls: IP restriction to your server IP
 */
@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY', '');
  }

  /**
   * Autocomplete address suggestions — restricted to UAE.
   * Used in the booking flow for pickup/drop-off location picker.
   */
  async autocomplete(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    const params: Record<string, string> = {
      input,
      key: this.apiKey,
      components: 'country:ae',     // UAE only
      language: 'en',
      types: 'establishment|geocode',
    };
    if (sessionToken) params.sessiontoken = sessionToken;

    try {
      const { data } = await axios.get(`${this.baseUrl}/place/autocomplete/json`, { params });

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`Places autocomplete: ${data.status}`);
        return [];
      }

      return (data.predictions ?? []).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
      }));
    } catch (err: any) {
      this.logger.error(`Autocomplete failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Get full details (coordinates, formatted address) for a Place ID.
   * Call this after the user selects an autocomplete suggestion.
   */
  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails | null> {
    const params: Record<string, string> = {
      place_id: placeId,
      fields: 'place_id,name,formatted_address,geometry',
      key: this.apiKey,
      language: 'en',
    };
    if (sessionToken) params.sessiontoken = sessionToken;

    try {
      const { data } = await axios.get(`${this.baseUrl}/place/details/json`, { params });

      if (data.status !== 'OK') {
        this.logger.warn(`Place details: ${data.status}`);
        return null;
      }

      const result = data.result;
      return {
        placeId: result.place_id,
        name: result.name,
        address: result.formatted_address,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      };
    } catch (err: any) {
      this.logger.error(`Place details failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Calculate driving distance between two locations.
   * Used to compute delivery/pickup surcharges.
   */
  async getDistance(origin: LatLng, destination: LatLng): Promise<DistanceResult | null> {
    const params = {
      origins: `${origin.lat},${origin.lng}`,
      destinations: `${destination.lat},${destination.lng}`,
      mode: 'driving',
      key: this.apiKey,
      region: 'ae',
    };

    try {
      const { data } = await axios.get(`${this.baseUrl}/distancematrix/json`, { params });

      const element = data.rows?.[0]?.elements?.[0];
      if (element?.status !== 'OK') {
        this.logger.warn(`Distance Matrix: ${element?.status}`);
        return null;
      }

      return {
        distanceKm: element.distance.value / 1000,
        durationMinutes: Math.ceil(element.duration.value / 60),
        durationText: element.duration.text,
      };
    } catch (err: any) {
      this.logger.error(`Distance Matrix failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Geocode a free-text address to coordinates.
   */
  async geocode(address: string): Promise<LatLng | null> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: { address, key: this.apiKey, region: 'ae', components: 'country:AE' },
      });

      if (data.status !== 'OK') return null;

      const loc = data.results[0]?.geometry?.location;
      return loc ? { lat: loc.lat, lng: loc.lng } : null;
    } catch (err: any) {
      this.logger.error(`Geocode failed: ${err.message}`);
      return null;
    }
  }
}
