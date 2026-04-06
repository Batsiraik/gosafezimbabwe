import Constants from 'expo-constants';

const getApiKey = (): string | null => {
  const key = Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined;
  return key && key.length > 0 ? key : null;
};

export type PlaceSuggestion = { placeId: string; text: string };

/**
 * Fetch place autocomplete suggestions (same as Next.js – Places API (New)).
 * Enable "Places API (New)" in Google Cloud if you get errors.
 */
export async function placeAutocomplete(
  input: string,
  options?: { locationBias?: { lat: number; lng: number }; regionCodes?: string[] }
): Promise<PlaceSuggestion[]> {
  const key = getApiKey();
  if (!key || !input.trim()) return [];
  try {
    const body: Record<string, unknown> = {
      input: input.trim(),
      includedRegionCodes: options?.regionCodes ?? ['ZW'],
    };
    if (options?.locationBias) {
      body.locationBias = {
        circle: {
          center: { latitude: options.locationBias.lat, longitude: options.locationBias.lng },
          radius: 50000,
        },
      };
    }
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const suggestions = data.suggestions as Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }> | undefined;
    if (!Array.isArray(suggestions)) return [];
    return suggestions
      .map((s) => {
        const id = s.placePrediction?.placeId;
        const text = s.placePrediction?.text?.text ?? '';
        return id && text ? { placeId: id, text } : null;
      })
      .filter((x): x is PlaceSuggestion => x != null);
  } catch {
    return [];
  }
}

export type PlaceDetails = { formattedAddress: string; lat: number; lng: number };

/**
 * Get place details by place ID (lat/lng + address). Same as Next.js.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = getApiKey();
  if (!key) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    });
    if (!res.ok) return null;
    const place = await res.json();
    const loc = place.location;
    if (loc?.latitude == null || loc?.longitude == null) return null;
    const formattedAddress =
      place.formattedAddress ?? place.displayName?.text ?? '';
    return {
      formattedAddress,
      lat: loc.latitude,
      lng: loc.longitude,
    };
  } catch {
    return null;
  }
}
