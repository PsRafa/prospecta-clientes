import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchPlaces } from "@/lib/googlePlaces";
import { getSupabaseServerClient } from "@/lib/supabase";
import { BRAZIL_CAPITALS } from "@/lib/brazilCapitals";
import type { Business } from "@/lib/types";

export const maxDuration = 60;

const searchSchema = z.object({
  niche: z.string().trim().min(2, "Informe o nicho (ex: salão de beleza)"),
  city: z.string().trim().optional(),
});

async function searchCity(niche: string, city: string, state: string | null) {
  const query = state ? `${city}, ${state}` : city;
  const results = await searchPlaces(niche, query);
  return results.map((place) => ({
    google_place_id: place.google_place_id,
    name: place.name,
    niche,
    phone: place.phone,
    website: place.website,
    address: place.address,
    city,
    state,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
  }));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const requestedCity = parsed.data.city?.trim();

  const targets = requestedCity
    ? (() => {
        const [cityPart, statePart] = requestedCity
          .split(",")
          .map((part) => part.trim());
        return [{ city: cityPart ?? requestedCity, state: statePart ?? null }];
      })()
    : BRAZIL_CAPITALS.map((c) => ({ city: c.city, state: c.state as string | null }));

  const settled = await Promise.allSettled(
    targets.map((t) => searchCity(parsed.data.niche, t.city, t.state))
  );

  const rows = settled
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof searchCity>>> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const failedCities = settled
    .map((r, i) => (r.status === "rejected" ? targets[i].city : null))
    .filter((c): c is string => c !== null);

  if (rows.length === 0) {
    return NextResponse.json({
      businesses: [] as Business[],
      failedCities,
    });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .upsert(rows, { onConflict: "google_place_id" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ businesses: data, failedCities });
}
