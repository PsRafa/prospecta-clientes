const PLACES_BASE_URL = "https://places.googleapis.com/v1/places";

export interface PlaceSearchResult {
  google_place_id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
}

interface RawPlace {
  id: string;
  displayName?: { text: string };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
}

function requireApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("Variável de ambiente ausente: GOOGLE_PLACES_API_KEY");
  }
  return key;
}

function mapPlace(place: RawPlace): PlaceSearchResult {
  return {
    google_place_id: place.id,
    name: place.displayName?.text ?? "Sem nome",
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    address: place.formattedAddress ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    rating: place.rating ?? null,
  };
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.formattedAddress",
  "places.location",
  "places.rating",
].join(",");

export async function searchPlaces(
  niche: string,
  city: string
): Promise<PlaceSearchResult[]> {
  const res = await fetch(`${PLACES_BASE_URL}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${niche} em ${city}`,
      languageCode: "pt-BR",
      regionCode: "BR",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Places search falhou (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).map(mapPlace);
}
